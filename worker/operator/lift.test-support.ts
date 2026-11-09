import type { User } from '../../src/shared/api'
import type { TestHarness } from '../test-support/harness'
import { TEST_TIME } from '../test-support/harness'
import { storeWorkspaceToken } from '../lifecycle/tokens'
import { addMember } from './directory.test-support'
import { seedBuild, seedOrg, seedWorkspace } from './overview.test-support'

export function suspensionRequest(
  harness: TestHarness,
  cookie: string,
  path: string,
  method: 'POST' | 'DELETE',
): Promise<Response> {
  return harness.request(path, cookie, { method, body: '{}' })
}

export function suspensionEvents(db: D1Database) {
  return db
    .prepare(
      `SELECT target_kind AS targetKind, target_id AS targetId, action,
       occurred_at AS occurredAt, operator_user_id AS operatorId
       FROM suspension_events ORDER BY id`,
    )
    .all<{
      targetKind: 'user' | 'org'
      targetId: string
      action: 'suspend' | 'lift'
      occurredAt: number
      operatorId: string | null
    }>()
    .then((result) => result.results)
}

export async function userResources(harness: TestHarness, user: User) {
  await seedOrg(harness, { id: 'resources' })
  await addMember(harness, 'resources', user.githubId)
  await seedWorkspace(harness, {
    id: 'owned-workspace',
    orgId: 'resources',
    state: 'stopped',
  })
  await harness.env.DB.prepare(
    'UPDATE workspaces SET owner_user_id = ? WHERE id = ?',
  )
    .bind(user.id, 'owned-workspace')
    .run()
  const token = 'revoked-workspace-token'
  await storeWorkspaceToken(harness.env, 'owned-workspace', token, TEST_TIME)
  await harness.env.DB.prepare(
    `INSERT INTO preview_hostnames
     (id, hostname, org_id, workspace_id, port, created_at, expires_at)
     VALUES ('preview', 'old.conductive.test', 'resources', 'owned-workspace', 3000, ?, ?)`,
  )
    .bind(TEST_TIME, TEST_TIME + 86_400_000)
    .run()
  await seedBuild(harness, {
    id: 'failed-build',
    orgId: 'resources',
    kind: 'build',
    state: 'failed',
    phase: 'done',
  })
  await harness.env.DB.prepare(
    'UPDATE image_builds SET started_by_user_id = ? WHERE id = ?',
  )
    .bind(user.id, 'failed-build')
    .run()
  return token
}
