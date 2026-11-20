import { afterEach, beforeAll, expect, it } from 'vitest'
import { agentSessionsPath } from '../../src/shared/agent-session-paths'
import { orgAgentLoginPath } from '../../src/shared/org-settings'
import {
  OUTER_ORG,
  OTHER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from './agent-session-writes.test-support'

let bundle: string
let active: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await active?.dispose()
})

it('starts and replays a tool session on the org login for a sender without a personal login', async () => {
  const fixture = (active = await agentWriteFixture(bundle))
  const saved = await fixture.request(orgAgentLoginPath(OUTER_ORG, 'claude'), {
    method: 'PUT',
    body: JSON.stringify({
      agent: 'claude',
      kind: 'api-key',
      secret: 'org-tool-key',
    }),
  })
  expect(saved.status).toBe(200)
  await fixture.env.DB.prepare(
    "DELETE FROM agent_logins WHERE user_id = 'member'",
  ).run()
  const input = {
    requestId: 'org-tool-session',
    firstMessage: 'Use the org login',
  }
  const response = await fixture.post(agentSessionsPath(OTHER_WORKSPACE), input)
  expect(response.status).toBe(201)
  const accepted: unknown = await response.json()
  expect(accepted).toMatchObject({
    session: {
      startedBy: { id: 'member' },
      login: { type: 'org', orgId: OUTER_ORG },
      loginAvailable: true,
      loginShared: true,
    },
    message: { sender: { id: 'member' } },
  })
  await fixture.restart()
  expect(
    await (
      await fixture.post(agentSessionsPath(OTHER_WORKSPACE), input)
    ).json(),
  ).toEqual(accepted)
  expect(JSON.stringify(accepted)).not.toContain('org-tool-key')
})
