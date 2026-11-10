import { expect, it, vi } from 'vitest'

import { importDocumentFile } from '../../src/shared/conductor-import-manifest'
import type { RunnerImportPreparation } from '../../src/shared/runner-import'
import { engineFixture } from '../test-support/engine'
import { deferred, sessionTurn } from '../test-support/runtime'

async function importedEngine() {
  const updates: RunnerImportPreparation[] = []
  const h = await engineFixture({
    emitImport: async (event) => {
      updates.push(event)
    },
  })
  await h.store.remember({
    sessionId: 'imported',
    agent: 'claude',
    providerSessionId: 'native-session',
    instructions: 'Keep these saved instructions.',
    conductorImport: { documentId: 'old-document', preparation: 'prepared' },
  })
  return { ...h, updates }
}

it('closes rejected native preparation and credentials before one document fallback without changing the member message', async () => {
  const h = await importedEngine()
  const command = sessionTurn('imported', 'first')
  await h.engine.command(command)
  const native = h.providers.latest
  const entered = deferred<void>()
  const release = deferred<void>()
  const order: string[] = []
  native.options.lifetime?.registerCleanup(async () => {
    order.push('credentials closed')
  })
  vi.spyOn(native, 'close').mockImplementation(async () => {
    entered.resolve()
    await release.promise
    native.closed = true
    order.push('provider closed')
  })
  native.emit({
    type: 'failed',
    code: 'native_history_unavailable',
    message: 'The earlier agent session could not resume.',
  })
  const settled = h.engine.idle()
  await entered.promise
  try {
    expect(h.providers.processes).toHaveLength(1)
    expect(h.store.snapshot.sessions[0].conductorImport?.preparation).toBe(
      'prepared',
    )
  } finally {
    release.resolve()
    await settled
  }
  expect(order).toEqual(['credentials closed', 'provider closed'])
  expect(h.providers.processes).toHaveLength(2)
  expect(h.providers.latest.options).toMatchObject({
    conversationId: null,
    instructions: 'Keep these saved instructions.',
    importDocument: importDocumentFile('old-document'),
  })
  expect(h.providers.latest.messages[0].message).toEqual(command.message)
  expect(h.updates).toEqual([
    {
      type: 'import.preparation',
      sessionId: 'imported',
      turnId: command.turnId,
      documentId: 'old-document',
      preparation: 'fallback',
    },
  ])
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: [command.message.id],
  })
  await h.engine.idle()
  await h.engine.command(sessionTurn('imported', 'second'))
  expect(h.providers.latest.options.importDocument).toBeUndefined()
  expect(h.providers.latest.options.conversationId).toBe('conversation-2')
})

it('keeps native preparation after generic login, network, process or abort failures', async () => {
  const h = await importedEngine()
  for (const code of [
    'agent_authentication_failed',
    'agent_failed',
    'agent_exited',
    'agent_aborted',
  ]) {
    await h.engine.command(sessionTurn('imported', code))
    h.providers.latest.emit({
      type: 'failed',
      code,
      message: 'Temporary failure.',
    })
    await h.engine.idle()
  }
  expect(h.providers.processes).toHaveLength(4)
  expect(
    h.providers.processes.map((provider) => provider.options.conversationId),
  ).toEqual([
    'native-session',
    'native-session',
    'native-session',
    'native-session',
  ])
  expect(h.store.snapshot.sessions[0].conductorImport).toEqual({
    documentId: 'old-document',
    preparation: 'prepared',
  })
  expect(h.updates).toEqual([])
})

it.each(['answer', 'tool'] as const)(
  'never replays rejected native input after %s output starts',
  async (kind) => {
    const h = await importedEngine()
    await h.engine.command(sessionTurn('imported'))
    if (kind === 'answer')
      h.providers.latest.emit({
        type: 'delta',
        messageId: 'answer-1',
        text: 'Started.',
      })
    else
      h.providers.latest.emit({
        type: 'tool',
        tool: {
          id: 'tool-1',
          kind: 'run',
          target: 'build',
          detail: null,
          omittedDetailBytes: 0,
          state: 'running',
        },
      })
    h.providers.latest.emit({
      type: 'failed',
      code: 'native_history_unavailable',
      message: 'The earlier agent session could not resume.',
    })
    await h.engine.idle()
    expect(h.providers.processes).toHaveLength(1)
    expect(h.providers.latest.messages).toHaveLength(1)
    expect(h.updates).toEqual([])
    expect(h.events.at(-1)).toMatchObject({
      type: 'turn.failed',
      error: { code: 'native_history_unavailable' },
    })
  },
)
