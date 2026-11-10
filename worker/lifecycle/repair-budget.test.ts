import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { realRuntimeFixture, runtimeBundle } from './real-runtime-test-support'

let bundle: string
let fixture: Awaited<ReturnType<typeof realRuntimeFixture>>
beforeAll(async () => {
  bundle = await runtimeBundle()
})
beforeEach(async () => {
  fixture = await realRuntimeFixture(bundle)
})
afterEach(async () => fixture.dispose())

it('limits each repair kind to fifty, logs its counts, and advances failed attempts before the next run', async () => {
  const db = fixture.env.DB
  const deadline = TEST_TIME - 15 * 60 * 1_000
  const sequence = `WITH RECURSIVE sequence(n) AS (VALUES(1) UNION ALL SELECT n + 1 FROM sequence WHERE n < 51)`
  await db.batch([
    db
      .prepare('UPDATE org_images SET next_image_refresh_at = ?')
      .bind(TEST_TIME + 86_400_000),
    db
      .prepare(
        `${sequence} INSERT INTO orgs (id, name, creator_user_id, created_at)
      SELECT 'repair-org-' || n, 'Repair org', ?, ? FROM sequence`,
      )
      .bind('runtime-user', TEST_TIME),
    db
      .prepare(
        `${sequence} INSERT INTO org_members (org_id, user_id, role, joined_at)
      SELECT 'repair-org-' || n, ?, 'admin', ? FROM sequence`,
      )
      .bind('runtime-user', TEST_TIME),
    db
      .prepare(
        `${sequence} INSERT INTO settings (org_id, updated_at)
      SELECT 'repair-org-' || n, ? FROM sequence`,
      )
      .bind(TEST_TIME),
    db
      .prepare(
        `${sequence} INSERT INTO org_images (org_id, provider_account, image_name, next_image_refresh_at)
      SELECT 'repair-org-' || n, 'boat', 'image', ? FROM sequence`,
      )
      .bind(deadline),
    db
      .prepare(
        `${sequence} INSERT INTO workspaces
      (id, org_id, repository_id, owner_user_id, name, branch, sandbox_id, state, created_at, updated_at, next_disk_keepalive_at)
      SELECT 'repair-workspace-' || n, ?, ?, ?, 'Repair workspace', 'main', 'repair-computer-' || n, 'stopped', ?, ?, ? FROM sequence`,
      )
      .bind(
        'runtime-org',
        'runtime-repo',
        'runtime-user',
        TEST_TIME,
        TEST_TIME,
        deadline,
      ),
  ])
  const report = await fixture
    .actor('repair-budget-probe')
    .repairBudget(TEST_TIME)
  expect(report.first).toEqual({
    workspaces: 50,
    orgs: 50,
    pendingWorkspaces: 50,
    pendingOrgs: 50,
  })
  expect(report.firstWorkspaces).toHaveLength(50)
  expect(report.firstOrgs).toHaveLength(50)
  expect(report.firstWarnings).toEqual([
    {
      kind: 'lifecycle_repair_limited',
      message: 'Lifecycle repair limited its checks.',
      resource: 'workspace',
      limit: 50,
    },
    {
      kind: 'lifecycle_repair_limited',
      message: 'Lifecycle repair limited its checks.',
      resource: 'org',
      limit: 50,
    },
    {
      kind: 'lifecycle_repair_pending',
      message: 'Lifecycle repair left checks pending.',
      workspaces: 50,
      orgs: 50,
    },
  ])
  expect(report.movedWorkspaces).toBe(50)
  expect(report.movedOrgs).toBe(50)
  expect(report.second).toEqual({
    workspaces: 1,
    orgs: 1,
    pendingWorkspaces: 1,
    pendingOrgs: 1,
  })
  expect(report.secondWorkspaces).toHaveLength(51)
  expect(report.secondOrgs).toHaveLength(51)
  expect(new Set(report.secondWorkspaces).size).toBe(51)
  expect(new Set(report.secondOrgs).size).toBe(51)
  expect(report.third).toEqual({
    workspaces: 0,
    orgs: 0,
    pendingWorkspaces: 0,
    pendingOrgs: 0,
  })
  expect(report.workspaceCalls).toHaveLength(51)
  expect(report.orgCalls).toHaveLength(51)
})
