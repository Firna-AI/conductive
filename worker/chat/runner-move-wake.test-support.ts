import type { Miniflare } from 'miniflare'

import { WORKSPACE_ID } from './harness.test-support'

export const ORIGINAL_FOLDER = '/home/user/code/repo'
export const MOVED_FOLDER = '/home/user/code/billing'

export async function seedMoveFolders(runtime: Miniflare): Promise<void> {
  const db = await runtime.getD1Database('DB')
  await db.batch([
    db.prepare(
      "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('billing', 'org', 11, 'owner/billing', 'trunk')",
    ),
    db
      .prepare(
        `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id, repository_locations_json)
        VALUES (?, 'org', 'owner', 'first-session', 'first-turn', 'claude', 'test-claude', 'high', 'first-message', ?)`,
      )
      .bind(
        WORKSPACE_ID,
        JSON.stringify([
          {
            repositoryId: 'repo',
            directory: ORIGINAL_FOLDER,
            variable: 'CONDUCTIVE_REPOSITORY_REPO_DIR',
          },
          {
            repositoryId: 'billing',
            directory: MOVED_FOLDER,
            variable: 'CONDUCTIVE_REPOSITORY_BILLING_DIR',
          },
        ]),
      ),
  ])
}

export async function moveRepositoryRecord(runtime: Miniflare): Promise<void> {
  const db = await runtime.getD1Database('DB')
  await db
    .prepare(
      "UPDATE workspaces SET repository_id = 'billing', branch = 'owner/billing' WHERE id = ?",
    )
    .bind(WORKSPACE_ID)
    .run()
}
