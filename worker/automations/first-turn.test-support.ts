import {
  CLAUDE,
  WORKSPACE_ID,
  type ChatFixture,
} from '../chat/harness.test-support'
import { TEST_TIME } from '../test-support/harness'
import { seedAutomation, seedAutomationRun } from '../test-support/d1-seeds'
import { finishAutomationRun } from './run-outcome-data'

export async function seedChatRun(
  fixture: ChatFixture,
  turnId: string,
  sessionId: string,
  messageId = 'message-1',
) {
  const db = fixture.env.DB
  await db.batch([
    seedAutomation(db, {
      id: 'chat-automation',
      orgId: fixture.org.id,
      ownerUserId: fixture.owner.id,
      name: 'Review',
      repositoryId: 'repo',
      sectionId: `general-${fixture.org.id}`,
      prompt: 'Review the changes.',
      agent: CLAUDE.agent,
      model: CLAUDE.model,
      effort: CLAUDE.effort,
      timeZone: 'UTC',
      triggersJson: '[]',
      createdAt: TEST_TIME,
      updatedAt: TEST_TIME,
    }),
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
    seedAutomationRun(db, {
      id: 'first-run',
      automationId: 'chat-automation',
      orgId: fixture.org.id,
      ownerUserId: fixture.owner.id,
      runKey: 'manual:chat-automation:first',
      messageId,
      triggerJson: '{"kind":"run-now"}',
      state: 'started',
      workspaceId: WORKSPACE_ID,
      createdAt: TEST_TIME,
      updatedAt: TEST_TIME,
    }),
  ])
}

export async function twoEarlierFailures(fixture: ChatFixture) {
  const db = fixture.env.DB
  for (const id of ['failed-before-one', 'failed-before-two']) {
    await seedAutomationRun(db, {
      id,
      automationId: 'chat-automation',
      orgId: fixture.org.id,
      runKey: `manual:chat-automation:${id}`,
      messageId: `message-${id}`,
      triggerJson: '{"kind":"run-now"}',
      createdAt: TEST_TIME - 1,
      updatedAt: TEST_TIME - 1,
    }).run()
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
