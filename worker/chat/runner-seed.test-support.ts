import { hash } from '../security/crypto'
import type { TestHarness } from '../test-support/harness'

export async function seedRunnerWorkspace(harness: TestHarness) {
  const db = harness.env.DB
  await db.batch([
    db.prepare(
      "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('sender', 1, 'sender', 25, 25)",
    ),
    db.prepare(
      "INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES ('org', 'Org', 'sender', 25)",
    ),
    db.prepare(
      "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES ('org', 'sender', 'admin', 25)",
    ),
    db.prepare(
      "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('repo', 'org', 1, 'sender/repo', 'main')",
    ),
    db.prepare(
      "INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch, created_at, updated_at) VALUES ('workspace', 'org', 'repo', 'sender', '', 'main', 25, 25)",
    ),
    db
      .prepare(
        "INSERT INTO workspace_tokens (workspace_id, token_hash, ciphertext, created_at) VALUES ('workspace', ?, 'unused', 25)",
      )
      .bind(await hash('runner-limits-token')),
  ])
}
