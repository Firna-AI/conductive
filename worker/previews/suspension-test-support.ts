import { API_PATHS, type User } from '../../src/shared/api'
import { TEST_ORIGIN, TEST_TIME } from '../test-support/harness'
import type { ToolsHarness } from './test-support'

export async function activeMember(harness: ToolsHarness, orgId: string) {
  harness.github.profile = { id: 8, login: 'active-member' }
  const session = await harness.login()
  const response = await harness.request(API_PATHS.session, session)
  const { user }: { user: User } = await response.json()
  await harness.env.DB.prepare(
    "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)",
  )
    .bind(orgId, user.id, TEST_TIME)
    .run()
  return {
    user,
    session,
    request: (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers)
      headers.set('Cookie', session)
      headers.set('Origin', TEST_ORIGIN)
      if (init.body) headers.set('Content-Type', 'application/json')
      return new Request(`${TEST_ORIGIN}${path}`, { ...init, headers })
    },
  }
}

export async function suspendWorkspaceOwner(
  harness: ToolsHarness,
  workspaceId: string,
) {
  await harness.env.DB.prepare(
    `UPDATE users SET suspended_at = ?
     WHERE id = (SELECT owner_user_id FROM workspaces WHERE id = ?)`,
  )
    .bind(TEST_TIME, workspaceId)
    .run()
}
