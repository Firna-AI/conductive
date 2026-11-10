import { vi } from 'vitest'

import type { RoutineRunTrigger } from '../../src/shared/routines'
import { agentLoginContext } from '../chat/queries'
import { backendFixture } from '../lifecycle/backend-test-support'
import { encrypt } from '../security/crypto'
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
    db
      .prepare(
        `INSERT INTO routines
      (id, org_id, owner_user_id, name, repository_id, section_id, prompt, agent, model, effort,
       time_zone, triggers_json, next_run_at, created_at, updated_at)
      VALUES ('routine-one', ?, ?, 'Morning summary', ?, 'run-section', 'Summarize the work.',
        'codex', 'run-model', 'high', 'Europe/London', '[]', ?, ?, ?)`,
      )
      .bind(
        org.id,
        user.id,
        repositoryId,
        TEST_TIME + 60_000,
        TEST_TIME,
        TEST_TIME,
      ),
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
    trigger: RoutineRunTrigger = { kind: 'run-now' },
  ) => {
    await db
      .prepare(
        `INSERT INTO routine_runs
      (id, routine_id, org_id, owner_user_id, run_key, message_id, trigger_json, created_at, updated_at)
      VALUES (?, 'routine-one', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        org.id,
        user.id,
        `manual:routine-one:${id}`,
        `message-${id}`,
        JSON.stringify(trigger),
        TEST_TIME,
        TEST_TIME,
      )
      .run()
    return id
  }
  return {
    ...fixture,
    runtime: { ...runtime, acceptFirstMessage },
    acceptFirstMessage,
    seedRun,
  }
}
