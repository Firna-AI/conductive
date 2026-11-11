import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  agentSessionsPath,
  agentSessionMessagesPath,
} from '../../src/shared/agent-tools'
import {
  OUTER_ORG,
  OTHER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import type { Workspace } from '../chat/integration/workspace-review-entry.test-support'
import { CLAUDE } from '../chat/harness.test-support'
import { record } from '../chat/inputs'
import { array } from '../chat/agent-events'
import { chatHistoryPath } from '../../src/shared/events'
import { driveWorkspaceStart } from '../chat/integration/workspace-start.test-support'
import type { WorkspaceStartResult } from '../lifecycle/start-types'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from './agent-session-writes.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/chat/integration/workspace-review-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
})

async function target(active: AgentWriteFixture) {
  const actor = (
    await active.runtime.getBindings<{
      WORKSPACES: DurableObjectNamespace<Workspace>
    }>()
  ).WORKSPACES.getByName(OTHER_WORKSPACE)
  await active.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
  )
    .bind('bx_tool_resume', OTHER_WORKSPACE)
    .run()
  active.boat.states.set('bx_tool_resume', 'archived')
  const sessionId = `session-${OTHER_WORKSPACE}`
  await actor.initializeLifecycle({
    workspaceId: OTHER_WORKSPACE,
    orgId: OUTER_ORG,
    firstMessage: {
      id: `message-${OTHER_WORKSPACE}`,
      text: 'Original queued work',
      choice: CLAUDE,
      attachmentIds: [],
    },
    firstTurn: {
      sessionId,
      turnId: `turn-${OTHER_WORKSPACE}`,
      senderUserId: 'owner',
    },
  })
  return { actor, sessionId }
}

it('queues a stopped computer before replying and retries a failed later start without repeating the message', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const { actor, sessionId } = await target(active)
  await actor.beginLifecycleStart('create')
  await actor.lifecyclePrepared()
  await actor.lifecycleStopped()
  const empty = await active.post(agentSessionsPath(OTHER_WORKSPACE), {
    requestId: 'empty-while-stopped',
  })
  expect(empty.status).toBe(201)
  expect(await empty.json()).toMatchObject({
    workspace: { state: 'stopped' },
    message: null,
    resume: { state: 'not_needed' },
  })
  expect(await actor.readStartCheckpoint()).toBeUndefined()
  const input = { requestId: 'resume-message', text: 'Resume this work' }
  const path = agentSessionMessagesPath(OTHER_WORKSPACE, sessionId)
  const sending = active.post(path, input)
  const first = await Promise.race([
    sending.then((response) => ({ kind: 'reply' as const, response })),
    actor.waitLifecycleStart().then(() => ({ kind: 'finished' as const })),
  ])
  expect(first.kind).toBe('reply')
  if (first.kind !== 'reply')
    throw new Error('The early tool reply is missing.')
  expect(first.response.status).toBe(202)
  const accepted = record(await first.response.json())
  expect(accepted).toMatchObject({
    workspace: { state: 'starting' },
    resume: { state: 'queued', error: null },
  })
  expect((await actor.readStartCheckpoint())?.kind).toBe('resume')
  expect(active.boat.resumeIds).toEqual([])
  await actor.advanceStartAlarm()
  expect(active.boat.resumeIds).toEqual(['bx_tool_resume'])
  active.boat.synchronousExitCode = 1
  active.boat.commandExitCode = 1
  expect(
    await driveWorkspaceStart<WorkspaceStartResult<unknown>>(
      actor,
      actor.waitLifecycleStart(),
    ),
  ).toMatchObject({ ok: false, error: { code: 'workspace_start_failed' } })
  active.boat.synchronousExitCode = 0
  active.boat.commandExitCode = 0
  const retry = await active.post(path, input)
  expect(retry.status).toBe(202)
  const retried = record(await retry.json())
  expect(retried.message).toEqual(accepted.message)
  expect(retried.turnId).toBe(accepted.turnId)
  expect(retried).toMatchObject({
    workspace: { state: 'starting' },
    resume: { state: 'queued', error: null },
  })
})

it('keeps messages after a failed first start and waits for member Try again', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const { actor, sessionId } = await target(active)
  await actor.beginLifecycleStart('create')
  await actor.lifecycleStep('machine', 'Starting the cloud computer', 'running')
  await actor.lifecycleFailed({
    code: 'workspace_start_failed',
    message: 'The first start failed.',
    log: null,
  })
  const input = { requestId: 'failed-first-send', text: 'Keep this follow-up' }
  const response = await active.post(
    agentSessionMessagesPath(OTHER_WORKSPACE, sessionId),
    input,
  )
  expect(response.status).toBe(202)
  expect(await response.json()).toMatchObject({
    workspace: { state: 'error' },
    message: { sender: { id: 'member' } },
    resume: { state: 'waiting', error: null },
  })
  const created = await active.post(agentSessionsPath(OTHER_WORKSPACE), {
    requestId: 'failed-first-create',
    firstMessage: 'Keep this new session too',
  })
  expect(created.status).toBe(201)
  expect(await created.json()).toMatchObject({
    workspace: { state: 'error' },
    message: { sender: { id: 'member' } },
    resume: { state: 'waiting' },
  })
  expect(await actor.readStartCheckpoint()).toBeUndefined()
  expect(active.boat.starts).toHaveLength(0)
  expect(active.boat.resumeIds).toEqual([])
})

it('reports resume check failures while retaining one acceptance for a later retry', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const { actor, sessionId } = await target(active)
  await actor.beginLifecycleStart('create')
  await actor.lifecyclePrepared()
  await actor.lifecycleStopped()
  await active.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = NULL WHERE id = ?',
  )
    .bind(OTHER_WORKSPACE)
    .run()
  const path = agentSessionMessagesPath(OTHER_WORKSPACE, sessionId)
  const input = {
    requestId: 'missing-computer',
    text: 'Store this work before the resume check',
  }
  const first = await active.post(path, input)
  expect(first.status).toBe(202)
  const accepted = record(await first.json())
  expect(accepted).toMatchObject({
    workspace: { state: 'stopped' },
    message: { sender: { id: 'member' } },
    resume: { state: 'failed', error: { code: 'sandbox_unavailable' } },
  })
  expect(await (await active.post(path, input)).json()).toEqual(accepted)
  await active.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
  )
    .bind('bx_tool_resume', OTHER_WORKSPACE)
    .run()
  const repaired = record(await (await active.post(path, input)).json())
  expect(repaired.message).toEqual(accepted.message)
  expect(repaired.turnId).toBe(accepted.turnId)
  expect(repaired).toMatchObject({
    workspace: { state: 'starting' },
    resume: { state: 'queued', error: null },
  })
  const history = record(
    await (
      await active.request(
        chatHistoryPath(OUTER_ORG, OTHER_WORKSPACE, sessionId),
      )
    ).json(),
  )
  expect(
    array(history.events, record).filter((envelope) => {
      const event = record(envelope.event)
      return (
        event.type === 'message.accepted' &&
        record(event.message).id === record(accepted.message).id
      )
    }),
  ).toHaveLength(1)
  await actor.advanceStartAlarm()
  await actor.lifecycleStopped()
  await actor.lifecycleFailed({
    code: 'workspace_start_failed',
    message: 'The canceled start still needs cleanup.',
    log: null,
  })
  const waiting = record(await (await active.post(path, input)).json())
  expect(waiting.message).toEqual(accepted.message)
  expect(waiting).toMatchObject({
    workspace: { state: 'stopped' },
    resume: { state: 'waiting', error: null },
  })
})
