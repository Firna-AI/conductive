import { API_PATHS } from '../../src/shared/api'
import type { SessionResponse } from '../../src/shared/account'
import type { Agent } from '../../src/shared/generated/Agent'
import type { SaveOrgAgentLoginRequest } from '../../src/shared/org-agent-logins'
import {
  orgAgentLoginPath,
  orgSettingsPaths,
  refreshOrgAgentLoginModelsPath,
} from '../../src/shared/org-settings'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { seedBootIdentity } from './boot-account.test-support'
import { endpointModelApi } from './endpoint-models.test-support'

export const orgEndpoint =
  'https://proxy.example.test:8443/private/v1?key=address-secret'

export async function orgLoginFixture(harness: TestHarness) {
  const admin = await harness.login()
  const org = await harness.createOrg(admin)
  const { user }: SessionResponse = await (
    await harness.request(API_PATHS.session, admin)
  ).json()
  const member = await seedBootIdentity(harness, {
    githubId: 8,
    githubLogin: 'teammate',
    displayName: 'Teammate',
    avatarUrl: null,
    primaryVerifiedEmail: null,
    githubCreatedAt: null,
  })
  const { user: teammate }: SessionResponse = await (
    await harness.request(API_PATHS.session, member)
  ).json()
  await harness.env.DB.prepare(
    `INSERT INTO org_members (org_id, user_id, role, joined_at)
     VALUES (?, ?, 'member', ?)`,
  )
    .bind(org.id, teammate.id, TEST_TIME)
    .run()
  const api = endpointModelApi(harness)
  return {
    ...api,
    admin,
    member,
    org,
    userId: user.id,
    memberId: teammate.id,
    save: (
      body: SaveOrgAgentLoginRequest = {
        agent: 'claude',
        kind: 'api-key',
        secret: ' wrapped\n key ',
      },
      cookie = admin,
      orgId = org.id,
    ) =>
      api.request(orgAgentLoginPath(orgId, body.agent), cookie, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    read: (cookie = admin, orgId = org.id) =>
      api.request(orgSettingsPaths.agentLogins(orgId), cookie),
    switch: (useForEveryMember: boolean, agent: Agent = 'claude') =>
      api.request(orgAgentLoginPath(org.id, agent), admin, {
        method: 'PATCH',
        body: JSON.stringify({ useForEveryMember }),
      }),
    refresh: (agent: Agent = 'claude', cookie = admin) =>
      api.request(refreshOrgAgentLoginModelsPath(org.id, agent), cookie, {
        method: 'POST',
        body: '{}',
      }),
  }
}

export function savedOrgLogin(
  harness: TestHarness,
  orgId: string,
  agent: Agent = 'claude',
) {
  return harness.env.DB.prepare(
    `SELECT ciphertext, endpoint_origin AS origin, created_by AS createdBy,
     created_at AS createdAt, updated_at AS updatedAt,
     endpoint_model_ids AS ids, endpoint_models_read_at AS readAt
     FROM org_agent_logins WHERE org_id = ? AND agent = ?`,
  )
    .bind(orgId, agent)
    .first<{
      ciphertext: string
      origin: string | null
      createdBy: string | null
      createdAt: number
      updatedAt: number
      ids: string | null
      readAt: number | null
    }>()
}
