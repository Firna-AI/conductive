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

/**
 * A automation of the org. Its owner is the user with `ownerGithubId`, the
 * signed-in test user by default.
 */
export async function seedAutomation(
  harness: TestHarness,
  automation: { id: string; orgId: string; ownerGithubId?: number },
): Promise<void> {
  await harness.env.DB.prepare(
    `INSERT INTO automations
     (id, org_id, owner_user_id, name, repository_id, section_id, prompt,
      agent, model, effort, time_zone, triggers_json, created_at, updated_at)
     SELECT ?, ?, id, ?, ?, 'section', 'Review.', 'claude', 'model', 'high',
       'UTC', '[]', 0, 0 FROM users WHERE github_id = ?`,
  )
    .bind(
      automation.id,
      automation.orgId,
      automation.id,
      `repo-${automation.orgId}`,
      automation.ownerGithubId ?? 7,
    )
    .run()
}

/**
 * A run of a automation. Its owner, the owner at the time of the run, is the
 * user with `ownerGithubId`, the signed-in test user by default.
 */
export async function seedRun(
  harness: TestHarness,
  run: {
    id: string
    automationId: string
    orgId: string
    createdAt: number
    ownerGithubId?: number
    state?: string
  },
): Promise<void> {
  await harness.env.DB.prepare(
    `INSERT INTO automation_runs
     (id, automation_id, org_id, owner_user_id, run_key, message_id,
      trigger_json, state, created_at, updated_at)
     SELECT ?, ?, ?, id, ?, ?, '{"kind":"run-now"}', ?, ?, ?
     FROM users WHERE github_id = ?`,
  )
    .bind(
      run.id,
      run.automationId,
      run.orgId,
      `manual:${run.id}`,
      `message-${run.id}`,
      run.state ?? 'ready',
      run.createdAt,
      run.createdAt,
      run.ownerGithubId ?? 7,
    )
    .run()
}
