import { afterAll, beforeAll, expect, it } from 'vitest'

import { API_PATHS, type User } from '../../src/shared/api'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  authenticateWorkspaceToken,
  readWorkspaceToken,
  revokeWorkspaceToken,
  storeWorkspaceToken,
} from './tokens'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('encrypts a workspace token and rejects it after revocation or org deletion', async () => {
  const session = await harness.login()
  const org = await harness.createOrg(session)
  const response = await harness.request(API_PATHS.session, session)
  const { user }: { user: User } = await response.json()
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      'INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES (?, ?, ?, ?, ?)',
    ).bind('repository-one', org.id, 1, 'example/repository', 'main'),
    harness.env.DB.prepare(
      'INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      'workspace-one',
      org.id,
      'repository-one',
      user.id,
      'Lisbon',
      'octocat/lisbon-7k2q',
      TEST_TIME,
      TEST_TIME,
    ),
  ])
  await storeWorkspaceToken(
    harness.env,
    'workspace-one',
    'workspace-secret',
    TEST_TIME,
  )
  const stored = await harness.env.DB.prepare(
    'SELECT ciphertext, token_hash AS tokenHash FROM workspace_tokens WHERE workspace_id = ?',
  )
    .bind('workspace-one')
    .first<{ ciphertext: string; tokenHash: string }>()
  expect(stored?.ciphertext).not.toContain('workspace-secret')
  expect(stored?.tokenHash).not.toContain('workspace-secret')
  expect(await readWorkspaceToken(harness.env, 'workspace-one')).toBe(
    'workspace-secret',
  )
  expect(
    await authenticateWorkspaceToken(harness.env, 'workspace-secret'),
  ).toEqual({ workspaceId: 'workspace-one', orgId: org.id })
  await expect(
    authenticateWorkspaceToken(harness.env, 'another-secret'),
  ).rejects.toMatchObject({ status: 401, code: 'workspace_token_refused' })
  await harness.env.DB.prepare('UPDATE orgs SET deleted_at = ? WHERE id = ?')
    .bind(TEST_TIME, org.id)
    .run()
  await expect(
    authenticateWorkspaceToken(harness.env, 'workspace-secret'),
  ).rejects.toMatchObject({ status: 401, code: 'workspace_token_refused' })
  await harness.env.DB.prepare('UPDATE orgs SET deleted_at = NULL WHERE id = ?')
    .bind(org.id)
    .run()
  await revokeWorkspaceToken(harness.env.DB, 'workspace-one', TEST_TIME)
  await expect(
    authenticateWorkspaceToken(harness.env, 'workspace-secret'),
  ).rejects.toMatchObject({ status: 401, code: 'workspace_token_refused' })
  await expect(
    readWorkspaceToken(harness.env, 'workspace-one'),
  ).rejects.toMatchObject({ status: 409, code: 'workspace_token_unavailable' })
})
