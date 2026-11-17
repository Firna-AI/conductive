import { expect } from 'vitest'
import type { Agent } from '../../src/shared/generated/Agent'
import { orgAgentLoginPath } from '../../src/shared/org-settings'
import { encrypt } from '../security/crypto'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import type { ChatFixture } from './harness.test-support'
import { agentLoginContext } from './queries'

export async function saveChatOrgLogin(
  harness: TestHarness,
  fixture: ChatFixture,
  options: { agent?: Agent; secret?: string; endpoint?: string } = {},
) {
  const agent = options.agent ?? 'claude'
  const response = await harness.request(
    orgAgentLoginPath(fixture.org.id, agent),
    fixture.ownerCookie,
    {
      method: 'PUT',
      body: JSON.stringify({
        agent,
        kind: 'api-key',
        secret: options.secret ?? 'org-key',
      }),
    },
  )
  expect(response.status).toBe(200)
  if (options.endpoint) {
    await harness.env.DB.prepare(
      'UPDATE org_agent_logins SET kind = ?, ciphertext = ?, endpoint_origin = ? WHERE org_id = ? AND agent = ?',
    )
      .bind(
        'endpoint',
        await encrypt(
          JSON.stringify({
            endpoint: options.endpoint,
            secret: options.secret ?? 'org-key',
          }),
          agentLoginContext({ orgId: fixture.org.id }, agent),
          harness.env.BOAT_KEY_ENCRYPTION_KEY,
        ),
        new URL(options.endpoint).origin,
        fixture.org.id,
        agent,
      )
      .run()
  }
}

export async function preferChatOrgLogin(
  harness: TestHarness,
  fixture: ChatFixture,
  value: boolean,
  agent: Agent = 'claude',
) {
  const response = await harness.request(
    orgAgentLoginPath(fixture.org.id, agent),
    fixture.ownerCookie,
    {
      method: 'PATCH',
      body: JSON.stringify({ useForEveryMember: value }),
    },
  )
  expect(response.status).toBe(200)
}

export async function removePersonalLogin(
  harness: TestHarness,
  userId: string,
  agent: Agent = 'claude',
) {
  await harness.env.DB.prepare(
    'DELETE FROM agent_logins WHERE user_id = ? AND agent = ?',
  )
    .bind(userId, agent)
    .run()
}

export async function removeChatOrgLogin(
  harness: TestHarness,
  fixture: ChatFixture,
  agent: Agent = 'claude',
) {
  const response = await harness.request(
    orgAgentLoginPath(fixture.org.id, agent),
    fixture.ownerCookie,
    { method: 'DELETE', body: '{}' },
  )
  expect(response.status).toBe(204)
}

export async function replaceChatOrgLogin(
  harness: TestHarness,
  fixture: ChatFixture,
  secret: string,
) {
  await harness.env.DB.prepare(
    'UPDATE org_agent_logins SET ciphertext = ?, updated_at = ? WHERE org_id = ? AND agent = ?',
  )
    .bind(
      await encrypt(
        secret,
        agentLoginContext({ orgId: fixture.org.id }, 'claude'),
        harness.env.BOAT_KEY_ENCRYPTION_KEY,
      ),
      TEST_TIME + 1,
      fixture.org.id,
      'claude',
    )
    .run()
}
