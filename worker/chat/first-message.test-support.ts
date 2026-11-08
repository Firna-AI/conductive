import type { FirstWorkspaceMessage } from '../lifecycle/workspace-runtime'
import type { TestHarness } from '../test-support/harness'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'
import type { ChatDependencies } from './types'

export async function createFirstMessageFixture(
  harness: TestHarness,
  overrides: Partial<ChatDependencies> = {},
) {
  const fixture = await createChatFixture(harness, overrides)
  const first: FirstWorkspaceMessage = {
    workspaceId: WORKSPACE_ID,
    sessionId: 'first-session',
    turnId: 'first-turn',
    sender: {
      id: fixture.owner.id,
      githubId: 7,
      githubLogin: 'octocat',
      displayName: 'Octocat',
      avatarUrl: null,
    },
    request: {
      id: 'first-message',
      text: 'Fix the workspace title',
      choice: CLAUDE,
      attachmentIds: [],
    },
  }
  await harness.env.DB.batch([
    harness.env.DB.prepare('UPDATE workspaces SET name = ? WHERE id = ?').bind(
      'delft',
      WORKSPACE_ID,
    ),
    harness.env.DB.prepare(
      `INSERT INTO workspace_runtime
      (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      first.workspaceId,
      fixture.org.id,
      fixture.owner.id,
      first.sessionId,
      first.turnId,
      CLAUDE.agent,
      CLAUDE.model,
      CLAUDE.effort,
      first.request.id,
    ),
  ])
  return {
    fixture,
    first,
    acceptFirst: () =>
      fixture.chat.runLifecycle(() => fixture.chat.acceptFirstMessage(first)),
  }
}
