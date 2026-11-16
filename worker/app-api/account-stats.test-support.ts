import type { WorkspaceState } from '../../src/shared/generated/WorkspaceState'
import { expect } from 'vitest'

import { ACCOUNT_PATHS, type AccountStats } from '../../src/shared/account'
import type { TestHarness } from '../test-support/harness'

export async function accountStats(
  harness: TestHarness,
  cookie: string,
): Promise<AccountStats> {
  const response = await harness.request(ACCOUNT_PATHS.stats, cookie)
  expect(response.status).toBe(200)
  return response.json()
}

/** The ID of the person that `harness.login` signs in, GitHub ID 7. */
export async function signedInUserId(harness: TestHarness): Promise<string> {
  const row = await harness.env.DB.prepare(
    'SELECT id FROM users WHERE github_id = 7',
  ).first<{ id: string }>()
  if (!row) throw new Error('The signed-in user is missing')
  return row.id
}

/** Adds a person to an org, so that the person can own its records. */
export async function addMember(
  harness: TestHarness,
  orgId: string,
  userId: string,
): Promise<void> {
  await harness.env.DB.prepare(
    `INSERT INTO org_members (org_id, user_id, role, joined_at)
     VALUES (?, ?, 'member', 0)`,
  )
    .bind(orgId, userId)
    .run()
}

export async function seedOwnedWorkspace(
  harness: TestHarness,
  workspace: {
    id: string
    orgId: string
    ownerId: string
    createdAt: number
    state?: WorkspaceState
    archivedAt?: number
  },
): Promise<void> {
  await harness.env.DB.prepare(
    `INSERT INTO workspaces
     (id, org_id, repository_id, owner_user_id, name, branch, state,
      created_at, updated_at, archived_at)
     VALUES (?, ?, ?, ?, ?, 'main', ?, ?, ?, ?)`,
  )
    .bind(
      workspace.id,
      workspace.orgId,
      `repo-${workspace.orgId}`,
      workspace.ownerId,
      workspace.id,
      workspace.state ?? 'ready',
      workspace.createdAt,
      workspace.createdAt,
      workspace.archivedAt ?? null,
    )
    .run()
}

export async function seedRoutine(
  harness: TestHarness,
  routine: { id: string; orgId: string; ownerId: string },
): Promise<void> {
  await harness.env.DB.prepare(
    `INSERT INTO routines
     (id, org_id, owner_user_id, name, repository_id, section_id, prompt,
      agent, model, effort, time_zone, triggers_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'section', 'Review.', 'claude', 'model', 'high',
       'UTC', '[]', 0, 0)`,
  )
    .bind(
      routine.id,
      routine.orgId,
      routine.ownerId,
      routine.id,
      `repo-${routine.orgId}`,
    )
    .run()
}

export async function seedRun(
  harness: TestHarness,
  run: {
    id: string
    routineId: string
    orgId: string
    ownerId: string
    createdAt: number
    state?: string
  },
): Promise<void> {
  await harness.env.DB.prepare(
    `INSERT INTO routine_runs
     (id, routine_id, org_id, owner_user_id, run_key, message_id,
      trigger_json, state, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '{"kind":"run-now"}', ?, ?, ?)`,
  )
    .bind(
      run.id,
      run.routineId,
      run.orgId,
      run.ownerId,
      `manual:${run.id}`,
      `message-${run.id}`,
      run.state ?? 'ready',
      run.createdAt,
      run.createdAt,
    )
    .run()
}
