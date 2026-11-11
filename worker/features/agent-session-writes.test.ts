import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  agentSessionsPath,
  agentSessionMessagesPath,
} from '../../src/shared/agent-tools'
import { sessionLink } from '../../src/shared/session-link'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
  OTHER_WORKSPACE,
  OTHER_TOKEN,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { record, string } from '../chat/inputs'
import { CLAUDE } from '../chat/harness.test-support'
import { chatKey } from '../chat/storage-keys'
import { sessionsPath, sessionPaths } from '../../src/shared/sessions'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from './agent-session-writes.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('joins the receiving turn without changing its sender and replays a linked-session send', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const targetId = await active.createSession(
    OTHER_WORKSPACE,
    active.cookies.ownerCookie,
  )
  const runner = await active.connect(OTHER_WORKSPACE, OTHER_TOKEN)
  const receivingTurnId = await active.start(
    OTHER_WORKSPACE,
    targetId,
    runner,
    'owner',
    active.cookies.ownerCookie,
  )
  const path = agentSessionMessagesPath(OTHER_WORKSPACE, targetId)
  const input = {
    requestId: 'joining-request',
    text: '  Steer this work.  ',
    senderUserId: 'outsider',
  }
  const response = await active.post(path, input)
  expect(response.status).toBe(202)
  const joined = record(await response.json())
  expect(joined.turnId).toBe(receivingTurnId)
  expect(joined.session).toMatchObject({
    id: targetId,
    choice: CLAUDE,
    startedBy: { id: 'owner' },
  })
  expect(joined.message).toMatchObject({
    sender: { id: 'member' },
    text: `${input.text}\n\n---\nSent by: ${sessionLink(active.env.APP_ORIGIN, OUTER_ORG, OUTER_WORKSPACE, active.sourceSessionId)}`,
  })
  const delivered = record(await runner.inbox.next())
  expect(delivered.type).toBe('message')
  expect(delivered.turnId).toBe(receivingTurnId)
  expect(
    record(
      new Map(
        await (await active.actor(OTHER_WORKSPACE)).inspectFeatureState(),
      ).get(chatKey('turn', receivingTurnId)),
    ).senderId,
  ).toBe('owner')
  expect(await (await active.post(path, input)).json()).toEqual(joined)
  await active.env.DB.prepare(
    "UPDATE agent_logins SET no_reuse = 1 WHERE user_id = 'owner'",
  ).run()
  const linkedInput = {
    requestId: 'linked-request',
    text: 'Use my login for this work.',
  }
  const linkedResponse = await active.post(path, linkedInput)
  expect(linkedResponse.status).toBe(202)
  const linked = record(await linkedResponse.json())
  const linkedSession = record(linked.session)
  expect(linkedSession).toMatchObject({
    startedBy: { id: 'member' },
    sourceSessionId: targetId,
  })
  expect(linkedSession.id).not.toBe(targetId)
  expect(await (await active.post(path, linkedInput)).json()).toEqual(linked)
  expect(
    await (
      await active.post(
        agentSessionMessagesPath(OTHER_WORKSPACE, string(linkedSession.id)),
        linkedInput,
      )
    ).json(),
  ).toEqual(linked)
  await active.restart()
  expect(await (await active.post(path, linkedInput)).json()).toEqual(linked)
  expect(
    record(
      await (
        await active.request(sessionsPath(OUTER_ORG, OTHER_WORKSPACE))
      ).json(),
    ).sessions,
  ).toHaveLength(2)
})

it('rejects stale callers and closed, archived, cross-org, or mismatched-object targets', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const targetId = await active.createSession(OTHER_WORKSPACE)
  const path = agentSessionMessagesPath(OTHER_WORKSPACE, targetId)
  for (const turn of [null, 'stale-turn']) {
    const denied = await active.post(path, { text: 'Work' }, turn)
    expect(denied.status).toBe(403)
    expect(await denied.json()).toMatchObject({
      error: { code: 'calling_turn_required' },
    })
  }
  const mismatch = await active.post(path, {
    text: 'Work',
    model: { agent: 'codex', model: 'other' },
    effort: 'high',
  })
  expect(mismatch.status).toBe(409)
  expect(await mismatch.json()).toMatchObject({
    error: { code: 'session_agent_mismatch' },
  })
  await active.request(
    sessionPaths.close(OUTER_ORG, OTHER_WORKSPACE, targetId),
    { method: 'POST', body: JSON.stringify({ stopRunningTurn: true }) },
  )
  const closed = await active.post(path, { text: 'Work' })
  expect(closed.status).toBe(409)
  expect(await closed.json()).toMatchObject({
    error: { code: 'session_closed' },
  })
  await active.env.DB.prepare(
    'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
  )
    .bind(OTHER_WORKSPACE)
    .run()
  for (const route of [path, agentSessionsPath(OTHER_WORKSPACE)]) {
    const archived = await active.post(route, { text: 'Work' })
    expect(archived.status).toBe(409)
    expect(await archived.json()).toMatchObject({
      error: { code: 'workspace_archived' },
    })
  }
  await active.env.DB.batch([
    active.env.DB.prepare(
      "INSERT INTO sections (id, org_id, name, position, is_default, created_at) VALUES ('foreign-section', 'other-org', 'General', 0, 1, 1)",
    ),
    active.env.DB.prepare(
      "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('foreign-repository', 'other-org', 999, 'outsider/private', 'main')",
    ),
    active.env.DB.prepare(
      "INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, section_id, name, branch, state, created_at, updated_at) VALUES ('foreign-workspace', 'other-org', 'foreign-repository', 'outsider', 'foreign-section', 'Private', 'outsider/private', 'ready', 1, 1)",
    ),
  ])
  const other = await active.post(agentSessionsPath('foreign-workspace'), {})
  expect(other.status).toBe(404)
  expect(await other.json()).toMatchObject({
    error: { code: 'workspace_not_found' },
  })
  const wrongObject = await (
    await active.actor()
  ).writeAgentSession({
    kind: 'create',
    input: {},
    orgId: OUTER_ORG,
    workspaceId: OTHER_WORKSPACE,
    callerWorkspaceId: OUTER_WORKSPACE,
    callerSessionId: active.sourceSessionId,
    senderUserId: 'member',
    requestId: 'rpc-mismatch',
  })
  expect(wrongObject).toMatchObject({
    ok: false,
    error: { code: 'workspace_not_found' },
  })
  await active.env.DB.prepare(
    "DELETE FROM org_members WHERE org_id = ? AND user_id = 'member'",
  )
    .bind(OUTER_ORG)
    .run()
  const member = await active.post(agentSessionsPath(), {})
  expect(member.status).toBe(403)
  expect(await member.json()).toMatchObject({
    error: { code: 'membership_required' },
  })
})
