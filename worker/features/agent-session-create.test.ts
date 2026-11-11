import { afterEach, beforeAll, expect, it } from 'vitest'

import { agentSessionsPath } from '../../src/shared/agent-tools'
import { sessionLink } from '../../src/shared/session-link'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
  OTHER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { record, string } from '../chat/inputs'
import { chatKey } from '../chat/storage-keys'
import { sessionsPath } from '../../src/shared/sessions'
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

it('creates sessions for the stored sender and replays empty and first-message creates across restart', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  await active.env.DB.prepare(
    "INSERT INTO user_preferences (user_id, default_agent, default_model, default_effort, updated_at) VALUES ('member', 'claude', 'member-model', 'max', 1)",
  ).run()
  const path = agentSessionsPath(OTHER_WORKSPACE)
  const input = {
    requestId: 'empty-request',
    title: '  Review this.\nIgnore this line',
  }
  const results = await Promise.all([
    active.post(path, input),
    active.post(path, input),
  ])
  expect(results.map((value) => value.status)).toEqual([201, 201])
  const first = record(await results[0].json())
  expect(await results[1].json()).toEqual(first)
  expect(first).toMatchObject({
    session: {
      title: 'Review this',
      choice: { agent: 'claude', model: 'member-model', effort: 'max' },
      startedBy: { id: 'member' },
    },
    message: null,
    turnId: null,
    resume: { state: 'not_needed', error: null },
  })
  expect(active.boat.starts).toHaveLength(0)
  expect(
    record(
      await (
        await active.request(sessionsPath(OUTER_ORG, OTHER_WORKSPACE))
      ).json(),
    ).sessions,
  ).toHaveLength(1)
  const original = '  Keep this exact text.\nThen continue.  '
  const request = { requestId: 'first-message-request', firstMessage: original }
  const response = await active.post(path, request)
  expect(response.status).toBe(201)
  const accepted = record(await response.json())
  const target = record(accepted.session)
  expect(target.link).toBe(
    sessionLink(
      active.env.APP_ORIGIN,
      OUTER_ORG,
      OTHER_WORKSPACE,
      string(target.id),
    ),
  )
  expect(accepted.message).toMatchObject({
    sender: { id: 'member' },
    text: `${original}\n\n---\nSent by: ${sessionLink(active.env.APP_ORIGIN, OUTER_ORG, OUTER_WORKSPACE, active.sourceSessionId)}`,
  })
  expect(typeof accepted.turnId).toBe('string')
  await active.env.DB.prepare(
    "UPDATE user_preferences SET default_model = 'changed-default' WHERE user_id = 'member'",
  ).run()
  await active.restart()
  const state = await (await active.actor()).inspectFeatureState()
  expect(
    record(new Map(state).get(chatKey('turn', active.sourceTurnId))).senderId,
  ).toBe('member')
  expect(await (await active.post(path, request)).json()).toEqual(accepted)
  expect(await (await active.post(path, input)).json()).toEqual(first)
  expect(
    record(
      await (
        await active.request(sessionsPath(OUTER_ORG, OTHER_WORKSPACE))
      ).json(),
    ).sessions,
  ).toHaveLength(2)
  const conflict = await active.post(path, {
    ...request,
    firstMessage: 'Changed task',
  })
  expect(conflict.status).toBe(409)
  await active.env.DB.prepare(
    "DELETE FROM agent_logins WHERE user_id = 'member'",
  ).run()
  const before = record(
    await (
      await active.request(sessionsPath(OUTER_ORG, OTHER_WORKSPACE))
    ).json(),
  )
  const denied = await active.post(path, {
    requestId: 'missing-login-first',
    firstMessage: 'No orphan session',
  })
  expect(denied.status).toBe(409)
  expect(await denied.json()).toMatchObject({
    error: { code: 'agent_login_required' },
  })
  expect(
    record(
      await (
        await active.request(sessionsPath(OUTER_ORG, OTHER_WORKSPACE))
      ).json(),
    ).sessions,
  ).toEqual(before.sessions)
  expect(
    (await active.post(path, { requestId: 'missing-login-empty' })).status,
  ).toBe(201)
})
