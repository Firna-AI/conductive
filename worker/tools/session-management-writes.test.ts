import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  agentSessionPaths,
  agentSessionsPath,
  agentSessionMessagesPath,
} from '../../src/shared/agent-session-paths'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { record, string } from '../chat/inputs'
import { chatKey } from '../chat/storage-keys'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from '../features/agent-session-writes.test-support'
import { featureState } from '../features/fixture.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('renames another workspace session as the stored sender and checks current target access', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const id = await active.createSession(OTHER_WORKSPACE)
  const renamed = await active.post(
    agentSessionPaths.rename(OTHER_WORKSPACE, id),
    {
      title: '  Fix_my   session.\nIgnore this line',
      senderUserId: 'outsider',
    },
  )
  expect(renamed.status).toBe(200)
  expect(await renamed.json()).toMatchObject({
    session: { id, title: 'Fix_my session', closed: false },
  })
  const sent = await active.post(
    agentSessionMessagesPath(OTHER_WORKSPACE, id),
    { text: 'An automatic title candidate', requestId: 'keep-rename' },
  )
  expect(sent.status).toBe(202)
  const state = featureState(
    await (await active.actor(OTHER_WORKSPACE)).inspectFeatureState(),
  )
  expect(record(state.get(chatKey('session', id))).title).toBe('Fix_my session')
  for (const turn of [null, 'stale']) {
    const response = await active.post(
      agentSessionPaths.rename(OTHER_WORKSPACE, id),
      { title: 'Other' },
      turn,
    )
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      error: { code: 'calling_turn_required' },
    })
  }
  const blank = await active.post(
    agentSessionPaths.rename(OTHER_WORKSPACE, id),
    { title: '  ' },
  )
  expect(blank.status).toBe(400)
  expect(await blank.json()).toMatchObject({ error: { code: 'invalid_input' } })
  expect(
    await (
      await active.actor()
    ).manageAgentSession(
      {
        kind: 'rename',
        title: 'Wrong object',
        orgId: OUTER_ORG,
        workspaceId: OTHER_WORKSPACE,
        sessionId: id,
        callerWorkspaceId: 'forged',
        callerSessionId: 'forged',
        senderUserId: 'member',
      },
      active.env.APP_ORIGIN,
    ),
  ).toMatchObject({ ok: false, error: { code: 'workspace_not_found' } })
  await active.env.DB.prepare(
    'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
  )
    .bind(OTHER_WORKSPACE)
    .run()
  const archived = await active.post(
    agentSessionPaths.rename(OTHER_WORKSPACE, id),
    { title: 'Other' },
  )
  expect(archived.status).toBe(409)
  expect(await archived.json()).toMatchObject({
    error: { code: 'workspace_archived' },
  })
  await active.env.DB.prepare(
    'UPDATE workspaces SET archived_at = NULL WHERE id = ?',
  )
    .bind(OTHER_WORKSPACE)
    .run()
  await active.env.DB.prepare(
    "DELETE FROM org_members WHERE org_id = ? AND user_id = 'member'",
  )
    .bind(OUTER_ORG)
    .run()
  const left = await active.post(
    agentSessionPaths.rename(OTHER_WORKSPACE, id),
    { title: 'Other' },
  )
  expect(left.status).toBe(403)
  expect(await left.json()).toMatchObject({
    error: { code: 'membership_required' },
  })
})

it('closes running and queued sessions with truthful tool attribution without resuming a computer', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const queuedResponse = await active.post(agentSessionsPath(OTHER_WORKSPACE), {
    firstMessage: 'Queued after stop',
    requestId: 'queued-close',
  })
  expect(queuedResponse.status).toBe(201)
  const queued = record(await queuedResponse.json())
  const queuedId = string(record(queued.session).id)
  const closed = await active.post(
    agentSessionPaths.close(OTHER_WORKSPACE, queuedId),
    {},
  )
  expect(closed.status).toBe(200)
  expect(await closed.json()).toMatchObject({
    session: { id: queuedId, closed: true, state: 'idle' },
  })
  const id = await active.createSession(OTHER_WORKSPACE)
  const runner = await active.connect(OTHER_WORKSPACE, 'other-workspace-token')
  const turnId = await active.start(
    OTHER_WORKSPACE,
    id,
    runner,
    'owner',
    active.cookies.ownerCookie,
  )
  const denied = await active.post(
    agentSessionPaths.close(OTHER_WORKSPACE, id),
    {},
  )
  expect(denied.status).toBe(409)
  expect(await denied.json()).toMatchObject({
    error: { code: 'stop_confirmation_required' },
  })
  const closing = await active.post(
    agentSessionPaths.close(OTHER_WORKSPACE, id),
    { stopRunningTurn: true, callerSessionId: 'forged' },
  )
  expect(closing.status).toBe(200)
  expect(await closing.json()).toMatchObject({
    session: { id, closed: false, state: 'running' },
  })
  expect(await runner.inbox.next()).toMatchObject({ type: 'interrupt', turnId })
  const turn = record(
    featureState(
      await (await active.actor(OTHER_WORKSPACE)).inspectFeatureState(),
    ).get(chatKey('turn', turnId)),
  )
  expect(turn.stopRequest).toEqual({
    requestedBySession: {
      workspaceId: 'workspace one',
      sessionId: active.sourceSessionId,
    },
  })
  runner.emit({
    type: 'turn.completed',
    sessionId: id,
    turnId,
    state: 'stopped',
    durationMs: 1,
    files: [],
    omittedFileCount: 0,
    userMessageIds: ['owner-starting-message'],
  })
  await runner.inbox.next()
  const repeated = await active.post(
    agentSessionPaths.close(OTHER_WORKSPACE, id),
    {},
  )
  expect(repeated.status).toBe(200)
  expect(await repeated.json()).toMatchObject({
    session: { id, closed: true, state: 'idle' },
  })
  expect(active.boat.starts).toHaveLength(0)
})
