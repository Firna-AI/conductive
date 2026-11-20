import { vi } from 'vitest'

import type { AutomationRunTrigger } from '../../src/shared/automations'
import { agentLoginContext } from '../chat/queries'
import { backendFixture } from '../lifecycle/backend-test-support'
import { encrypt } from '../security/crypto'
import { seedAutomation, seedAutomationRun } from '../test-support/d1-seeds'
import { TEST_TIME, type TestHarness } from '../test-support/harness'

export async function runFixture(harness: TestHarness) {
  const fixture = await backendFixture(harness)
  const { runtime, org, user, repositoryId } = fixture
  const db = runtime.env.DB
  await db.batch([
    db
      .prepare(
        `INSERT INTO sections (id, org_id, name, position, created_at)
      VALUES ('run-section', ?, 'Runs', 1, ?)`,
      )
      .bind(org.id, TEST_TIME),
    seedAutomation(db, {
      id: 'automation-one',
      orgId: org.id,
      ownerUserId: user.id,
      name: 'Morning summary',
      repositoryId,
      sectionId: 'run-section',
      prompt: 'Summarize the work.',
      agent: 'codex',
      model: 'run-model',
      effort: 'high',
      timeZone: 'Europe/London',
      triggersJson: '[]',
      nextRunAt: TEST_TIME + 60_000,
      createdAt: TEST_TIME,
      updatedAt: TEST_TIME,
    }),
    db
      .prepare(
        `INSERT INTO agent_logins (user_id, agent, kind, ciphertext, no_reuse, created_at, updated_at)
      VALUES (?, 'codex', 'api-key', ?, 1, ?, ?)
      ON CONFLICT(user_id, agent) DO UPDATE SET
        kind = excluded.kind, ciphertext = excluded.ciphertext,
        no_reuse = excluded.no_reuse, updated_at = excluded.updated_at`,
      )
      .bind(
        user.id,
        await encrypt(
          'run-secret',
          agentLoginContext(user.id, 'codex'),
          runtime.env.BOAT_KEY_ENCRYPTION_KEY,
        ),
        TEST_TIME,
        TEST_TIME,
      ),
  ])
  const acceptFirstMessage = vi.fn(async () => undefined)
  const seedRun = async (
    id = 'run-one',
    trigger: AutomationRunTrigger = { kind: 'run-now' },
  ) => {
    await seedAutomationRun(db, {
      id,
      automationId: 'automation-one',
      orgId: org.id,
      ownerUserId: user.id,
      runKey: `manual:automation-one:${id}`,
      messageId: `message-${id}`,
      triggerJson: JSON.stringify(trigger),
      createdAt: TEST_TIME,
      updatedAt: TEST_TIME,
    }).run()
    return id
  }
  return {
    ...fixture,
    runtime: { ...runtime, acceptFirstMessage },
    acceptFirstMessage,
    seedRun,
  }
}
