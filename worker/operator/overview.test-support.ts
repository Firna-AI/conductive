import type { WorkspaceState } from '../../src/shared/generated/WorkspaceState'
import { expect } from 'vitest'

import {
  operatorOverviewPath,
  type OperatorOverview,
} from '../../src/shared/operator'

import { TEST_TIME, type TestHarness } from '../test-support/harness'
import {
  seedMember,
  seedWorkspace as seedWorkspaceRecord,
} from '../test-support/d1-seeds'

export async function overview(
  harness: TestHarness,
  cookie: string,
): Promise<OperatorOverview> {
  const response = await harness.request(operatorOverviewPath(), cookie)
  expect(response.status).toBe(200)
  return response.json()
}

export async function seedUser(
  harness: TestHarness,
  githubId: number,
  createdAt: number,
): Promise<void> {
  await harness.env.DB.prepare(
    `INSERT INTO users (id, github_id, github_login, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      `user-${githubId}`,
      githubId,
      `user-${githubId}`,
      createdAt,
      createdAt,
    )
    .run()
}

export async function seedOrg(
  harness: TestHarness,
  org: {
    id: string
    name?: string
    initials?: string
    createdAt?: number
    deletedAt?: number
  },
): Promise<void> {
  const db = harness.env.DB
  await db.batch([
    db
      .prepare(
        `INSERT INTO orgs (id, name, initials, creator_user_id, created_at, deleted_at)
         SELECT ?, ?, ?, id, ?, ? FROM users WHERE github_id = 7`,
      )
      .bind(
        org.id,
        org.name ?? org.id,
        org.initials ?? null,
        org.createdAt ?? TEST_TIME,
        org.deletedAt ?? null,
      ),
    seedMember(db, {
      orgId: org.id,
      userId: { githubId: 7 },
      role: 'admin',
      joinedAt: org.createdAt ?? TEST_TIME,
    }),
    db
      .prepare(
        `INSERT INTO repositories
         (id, org_id, github_repository_id, full_name, default_branch)
         VALUES (?, ?, 1, 'example/repo', 'main')`,
      )
      .bind(`repo-${org.id}`, org.id),
  ])
}

export async function seedWorkspace(
  harness: TestHarness,
  workspace: {
    id: string
    orgId: string
    state?: WorkspaceState
    createdAt?: number
    archivedAt?: number
    runningSince?: number | null
    lastActivityAt?: number | null
    sandboxId?: string | null
    ownerGithubId?: number
  },
): Promise<void> {
  const createdAt = workspace.createdAt ?? TEST_TIME
  await seedWorkspaceRecord(harness.env.DB, {
    id: workspace.id,
    orgId: workspace.orgId,
    repositoryId: `repo-${workspace.orgId}`,
    ownerUserId: { githubId: workspace.ownerGithubId ?? 7 },
    name: workspace.id,
    branch: 'main',
    state: workspace.state ?? 'ready',
    createdAt,
    updatedAt: createdAt,
    archivedAt: workspace.archivedAt ?? null,
    runningSince: workspace.runningSince ?? null,
    lastActivityAt: workspace.lastActivityAt ?? null,
    sandboxId: workspace.sandboxId ?? null,
  }).run()
}

export async function seedBuild(
  harness: TestHarness,
  build: {
    id: string
    orgId: string
    kind: 'build' | 'refresh'
    state: 'running' | 'succeeded' | 'failed'
    phase?: string
  },
): Promise<void> {
  const db = harness.env.DB
  await db
    .prepare(
      `INSERT INTO image_builds
       (id, org_id, kind, state, settings_revision, runner_protocol_version, started_at)
       VALUES (?, ?, ?, ?, 1, 1, ?)`,
    )
    .bind(build.id, build.orgId, build.kind, build.state, TEST_TIME)
    .run()
  if (build.phase !== undefined)
    await db
      .prepare(
        `INSERT INTO image_build_jobs
         (build_id, phase, install_script, repositories_json, software_json)
         VALUES (?, ?, '', '[]', '{}')`,
      )
      .bind(build.id, build.phase)
      .run()
}
