import {
  CLAUDE,
  WORKSPACE_ID,
  type ChatFixture,
} from '../chat/harness.test-support'
import { TEST_TIME } from '../test-support/harness'
import { finishAutomationRun } from './run-outcome-data'

export async function seedChatRun(
  fixture: ChatFixture,
  turnId: string,
  sessionId: string,
  messageId = 'message-1',
) {
  const db = fixture.env.DB
  await db.batch([
    db
      .prepare(
        `INSERT INTO automations
      (id, org_id, owner_user_id, name, repository_id, section_id, prompt, agent, model, effort,
       time_zone, triggers_json, created_at, updated_at)
      VALUES ('chat-automation', ?, ?, 'Review', 'repo', ?, 'Review the changes.', ?, ?, ?, 'UTC', '[]', ?, ?)`,
      )
      .bind(
        fixture.org.id,
        fixture.owner.id,
        `general-${fixture.org.id}`,
        CLAUDE.agent,
        CLAUDE.model,
        CLAUDE.effort,
        TEST_TIME,
        TEST_TIME,
      ),
    db
      .prepare(
        `INSERT INTO workspace_runtime
      (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        WORKSPACE_ID,
        fixture.org.id,
        fixture.owner.id,
        sessionId,
        turnId,
        CLAUDE.agent,
        CLAUDE.model,
        CLAUDE.effort,
        messageId,
      ),
    db
      .prepare(
        `INSERT INTO automation_runs
      (id, automation_id, org_id, owner_user_id, run_key, message_id, trigger_json, state, workspace_id, created_at, updated_at)
      VALUES ('first-run', 'chat-automation', ?, ?, 'manual:chat-automation:first', ?, '{"kind":"run-now"}', 'started', ?, ?, ?)`,
      )
      .bind(
        fixture.org.id,
        fixture.owner.id,
        messageId,
        WORKSPACE_ID,
        TEST_TIME,
        TEST_TIME,
      ),
  ])
}

export async function twoEarlierFailures(fixture: ChatFixture) {
  const db = fixture.env.DB
  for (const id of ['failed-before-one', 'failed-before-two']) {
    await db
      .prepare(
        `INSERT INTO automation_runs
      (id, automation_id, org_id, run_key, message_id, trigger_json, created_at, updated_at)
      VALUES (?, 'chat-automation', ?, ?, ?, '{"kind":"run-now"}', ?, ?)`,
      )
      .bind(
        id,
        fixture.org.id,
        `manual:chat-automation:${id}`,
        `message-${id}`,
        TEST_TIME - 1,
        TEST_TIME - 1,
      )
      .run()
    await finishAutomationRun(
      db,
      fixture.org.id,
      id,
      {
        state: 'failed',
        error: { code: 'agent_login_required', message: 'Connect Claude.' },
      },
      TEST_TIME,
    )
  }
}
