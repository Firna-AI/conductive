import { expect } from 'vitest'

import { ACCOUNT_PATHS, type AccountStats } from '../../src/shared/account'
import type { TestHarness } from '../test-support/harness'
import {
  seedAutomation as seedAutomationRecord,
  seedAutomationRun,
} from '../test-support/d1-seeds'

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
  await seedAutomationRecord(harness.env.DB, {
    id: automation.id,
    orgId: automation.orgId,
    ownerUserId: { githubId: automation.ownerGithubId ?? 7 },
    name: automation.id,
    repositoryId: `repo-${automation.orgId}`,
    sectionId: 'section',
    prompt: 'Review.',
    agent: 'claude',
    model: 'model',
    effort: 'high',
    timeZone: 'UTC',
    triggersJson: '[]',
    createdAt: 0,
    updatedAt: 0,
  }).run()
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
  await seedAutomationRun(harness.env.DB, {
    id: run.id,
    automationId: run.automationId,
    orgId: run.orgId,
    ownerUserId: { githubId: run.ownerGithubId ?? 7 },
    runKey: `manual:${run.id}`,
    messageId: `message-${run.id}`,
    triggerJson: '{"kind":"run-now"}',
    state: run.state ?? 'ready',
    createdAt: run.createdAt,
    updatedAt: run.createdAt,
  }).run()
}
