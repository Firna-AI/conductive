import type { WebSocket } from 'miniflare'
import { expect, it } from 'vitest'

import { chatHistoryPath } from '../../src/shared/events'
import { hash } from '../security/crypto'
import { TEST_ORIGIN } from '../test-support/harness'
import { createAdapterRuntime } from './adapter-runtime.test-support'
import { array } from './agent-events'
import { BROWSER_TEST_NOW } from './browser-clock.test-support'
import { WORKSPACE_ID, WORKSPACE_TOKEN } from './harness.test-support'
import { record } from './inputs'
import {
  MOVED_FOLDER,
  ORIGINAL_FOLDER,
  moveRepositoryRecord,
  seedMoveFolders,
} from './runner-move-wake.test-support'
import { disposeRunners, runnerControls } from './runner-native.test-support'

it.each([
  { source: 'hello', readyAtWake: false },
  { source: 'repository check', readyAtWake: true },
  { source: 'delivery', readyAtWake: true },
] as const)(
  'keeps a pending move from $source and all connection state through the original socket wake',
  async ({ source, readyAtWake }) => {
    const { runtime, headers } = await createAdapterRuntime(
      'worker/chat/runner-entry.test-support.ts',
    )
    const controls = runnerControls(runtime, headers)
    const sockets: WebSocket[] = []
    const streamId = '12345678-1234-4234-8234-123456789abc'
    const processStartId = 'abcdef01-2345-4678-89ab-cdef01234567'
    try {
      await seedMoveFolders(runtime)
      const previous = await controls.connect('previous-connection')
      sockets.push(previous.socket)
      if (source === 'hello') await moveRepositoryRecord(runtime)
      const runner = await controls.connect(streamId, 0, 2, processStartId, {
        repositoryFolder: ORIGINAL_FOLDER,
        loginKinds: [{ agent: 'claude', kind: 'api-key' }],
        fileServer: true,
      })
      sockets.push(runner.socket)
      expect(await previous.closed).toMatchObject({ code: 1000 })
      const sessionId = await controls.session()
      if (source !== 'hello') {
        runner.emit({ type: 'runner.ready' })
        expect(await runner.inbox.next()).toMatchObject({
          type: 'confirm',
          throughEventNumber: 1,
        })
        await controls.request('settled')
        await moveRepositoryRecord(runtime)
        if (source === 'repository check')
          await controls.request('check-repository')
        else await controls.send(sessionId, 'before-wake')
      }
      const move = record(await runner.inbox.next())
      expect(move).toMatchObject({
        type: 'repository.move',
        folder: MOVED_FOLDER,
        branches: { workspaceBranch: 'owner/billing', targetBranch: 'trunk' },
      })
      const before = record((await controls.request('settled')).runner)
      const woke = await controls.hibernate()
      expect(record(woke.runner).ready).toBe(readyAtWake)
      expect(woke.hello).toBe(2)
      expect(woke.detached).toBe(1)
      await controls.request('check-repository')
      expect(
        runner.received.filter(
          (value) => record(value).type === 'repository.move',
        ),
      ).toEqual([move])
      runner.emit({ type: 'runner.ready' })
      expect(await runner.inbox.next()).toEqual({
        type: 'confirm',
        streamId,
        throughEventNumber: source === 'hello' ? 1 : 2,
      })
      await controls.send(sessionId, 'after-wake')
      const after = await controls.request('settled')
      expect(after.runner).toEqual({
        id: before.id,
        generation: 2,
        workspace: {
          id: WORKSPACE_ID,
          orgId: 'org',
          tokenHash: await hash(WORKSPACE_TOKEN),
          archivedAt: null,
        },
        streamId,
        processStartId,
        protocolVersion: 2,
        loginKinds: [{ agent: 'claude', kind: 'api-key' }],
        repositoryFolder: ORIGINAL_FOLDER,
        repositoryMove: {
          commandId: move.commandId,
          folder: MOVED_FOLDER,
          refused: false,
        },
        fileServer: true,
        watchUntil: BROWSER_TEST_NOW + 30_000,
        ready: true,
        checkAt: BROWSER_TEST_NOW + 15_000,
      })
      expect(after.fileBinding).toBe(before.id)
      expect(after.fileAttached).toContain(before.id)
      expect(
        runner.received.filter((value) => record(value).type === 'welcome'),
      ).toHaveLength(1)
      expect(
        runner.received.filter((value) => record(value).type === 'turn'),
      ).toEqual([])
      expect(
        runner.received.filter(
          (value) => record(value).type === 'repository.move',
        ),
      ).toEqual([move])
    } finally {
      await disposeRunners(runtime, sockets)
    }
  },
)

it('keeps a refused move through the original socket wake and fails a later held turn', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/runner-entry.test-support.ts',
  )
  const controls = runnerControls(runtime, headers)
  const sockets: WebSocket[] = []
  try {
    await seedMoveFolders(runtime)
    await moveRepositoryRecord(runtime)
    const runner = await controls.connect('refused-move', 0, 2, undefined, {
      repositoryFolder: ORIGINAL_FOLDER,
    })
    sockets.push(runner.socket)
    const move = record(await runner.inbox.next())
    expect(move.type).toBe('repository.move')
    runner.emit({ type: 'runner.ready' })
    expect(await runner.inbox.next()).toMatchObject({
      type: 'confirm',
      throughEventNumber: 1,
    })
    runner.socket.send(
      JSON.stringify({
        type: 'repository.move.refused',
        commandId: move.commandId,
        reason: 'not_repository',
      }),
    )
    runner.emit({ type: 'skills.updated', claude: [], codex: [] })
    expect(await runner.inbox.next()).toMatchObject({
      type: 'confirm',
      throughEventNumber: 2,
    })
    await controls.hibernate()
    const sessionId = await controls.session()
    await controls.send(sessionId, 'refused-after-wake')
    await controls.request('settled')
    const history = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${chatHistoryPath('org', WORKSPACE_ID, sessionId)}`,
      { headers },
    )
    expect(history.status).toBe(200)
    const failures = array(record(await history.json()).events, record)
      .map(({ event }) => record(event))
      .filter(({ type }) => type === 'turn.failed')
    expect(failures).toMatchObject([
      {
        error: {
          code: 'workspace_repository_unavailable',
          message:
            "The agent could not open the folder of the workspace's repository in this cloud computer.",
        },
        retryMessageId: 'refused-after-wake',
      },
    ])
    expect(
      runner.received.filter(
        (value) => record(value).type === 'repository.move',
      ),
    ).toEqual([move])
    const after = await controls.request('inspect')
    expect(record(after.runner).repositoryMove).toEqual({
      commandId: move.commandId,
      folder: MOVED_FOLDER,
      refused: true,
    })
    expect(after.hello).toBe(1)
  } finally {
    await disposeRunners(runtime, sockets)
  }
})
