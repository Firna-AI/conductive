import { afterEach, beforeAll, expect, it } from 'vitest'

import { readNewestStoredEvents } from '../../src/chat/api/read-workspace'
import { chatHistoryPath } from '../../src/shared/events'
import { createWorkspaceToolClient } from '../../tools/client'
import {
  outerWorkerBundle,
  OUTER_MACHINE_ORIGIN,
} from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
  OUTER_TOKEN,
} from '../chat/integration/outer-seed.test-support'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from '../features/agent-session-writes.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('keeps a turn end reason in stored history and read_session after a restart', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const event = {
    type: 'turn.completed',
    sessionId: active.sourceSessionId,
    turnId: active.sourceTurnId,
    state: 'finished',
    durationMs: 125_000,
    files: [
      { path: 'src/checks.ts', change: 'modified', added: 2, removed: 1 },
    ],
    endReason: 'background_work_limit',
    omittedFileCount: 0,
    userMessageIds: ['member-starting-message'],
  } as const
  const sent = active.sourceRunner.emit(event)
  expect(await active.sourceRunner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: sent.eventNumber,
  })
  active.sourceRunner.resend(sent)
  expect(await active.sourceRunner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: sent.eventNumber,
  })
  await active.restart()

  const history = await active.request(
    chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, active.sourceSessionId),
  )
  expect(history.status).toBe(200)
  expect(
    readNewestStoredEvents(await history.json())
      .envelopes.map((envelope) => envelope.event)
      .filter((item) => item?.type === 'turn.completed'),
  ).toEqual([event])
  const client = createWorkspaceToolClient(
    { machineOrigin: OUTER_MACHINE_ORIGIN, workspaceToken: OUTER_TOKEN },
    async (request) => {
      const response = await active.runtime.dispatchFetch(request.url, {
        method: request.method,
        headers: Object.fromEntries(request.headers),
      })
      return new Response(await response.text(), {
        status: response.status,
        headers: Object.fromEntries(response.headers),
      })
    },
  )
  for (const detail of ['concise', 'full'] as const) {
    const read = await client.readSession(active.sourceSessionId, { detail })
    expect(read.detail).toBe(detail)
    expect(read.markdown).toContain(
      '_Background work stopped at the time limit_\n\n_Finished in 2m 5s. Changed files: `src/checks.ts`_',
    )
  }
})
