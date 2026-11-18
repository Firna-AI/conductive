import { afterEach, beforeAll, expect, it } from 'vitest'

import { agentSessionMessagesPath } from '../../src/shared/agent-session-paths'
import { sessionPaths, sessionsPath } from '../../src/shared/sessions'
import { workspacesPath } from '../../src/shared/workspaces'
import { CLAUDE } from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_TOKEN,
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from './agent-session-writes.test-support'
import { featureFixture, type FeatureFixture } from './fixture.test-support'

// Each answer of this entry waits for the background work of its request,
// so each read below sees a settled state.
let bundle: string
let fixture: FeatureFixture | AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/features/settled-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

async function lastActive(db: D1Database, userId: string) {
  const row = await db
    .prepare('SELECT last_active_at AS at FROM users WHERE id = ?')
    .bind(userId)
    .first<{ at: number | null }>()
  return row?.at ?? null
}

it('records the last active time of a new workspace and a sent message, and not of a new session', async () => {
  const active = (fixture = await featureFixture(bundle, {
    configuration: {},
  }))
  const { DB } = active.env
  expect(await lastActive(DB, 'member')).toBeNull()
  expect(await lastActive(DB, 'owner')).toBeNull()

  const created = await active.request(workspacesPath(OUTER_ORG), {
    method: 'POST',
    headers: { Cookie: active.cookies.memberCookie },
    body: JSON.stringify({
      repositoryId: OUTER_REPOSITORY,
      firstMessage: {
        id: 'activity-create-message',
        text: 'Start the work',
        choice: CLAUDE,
        attachmentIds: [],
      },
    }),
  })
  expect(created.status).toBe(201)
  expect(await lastActive(DB, 'member')).toBe(DEVICE_TEST_NOW)
  expect(await lastActive(DB, 'owner')).toBeNull()

  const session = await active.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: JSON.stringify({ choice: CLAUDE }) },
  )
  expect(session.status).toBe(201)
  const sessionId = string(record(record(await session.json()).session).id)
  expect(await lastActive(DB, 'owner')).toBeNull()

  const sent = await active.request(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, sessionId),
    {
      method: 'POST',
      body: JSON.stringify({
        id: 'activity-message',
        text: 'Check this code',
        choice: CLAUDE,
        attachmentIds: [],
      }),
    },
  )
  expect(sent.status).toBe(202)
  expect(await lastActive(DB, 'owner')).toBe(DEVICE_TEST_NOW)
})

it('does not record a message that an agent tool sends for the person', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const { DB } = active.env
  // The browser send that started the calling turn counts.
  expect(await lastActive(DB, 'member')).toBe(DEVICE_TEST_NOW)
  const targetId = await active.createSession(
    OTHER_WORKSPACE,
    active.cookies.ownerCookie,
  )
  const runner = await active.connect(OTHER_WORKSPACE, OTHER_TOKEN)
  await active.start(
    OTHER_WORKSPACE,
    targetId,
    runner,
    'owner',
    active.cookies.ownerCookie,
  )
  await DB.prepare('UPDATE users SET last_active_at = NULL').run()

  const response = await active.post(
    agentSessionMessagesPath(OTHER_WORKSPACE, targetId),
    { requestId: 'agent-request', text: 'Steer this work.' },
  )
  expect(response.status).toBe(202)
  expect(await lastActive(DB, 'member')).toBeNull()
  expect(await lastActive(DB, 'owner')).toBeNull()
})
