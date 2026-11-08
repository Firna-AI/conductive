import { afterAll, beforeAll, beforeEach } from 'vitest'

import type { User } from '../../src/shared/api'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'

const orgId = 'shell-list-org'
const repositoryId = 'shell-list-repository'
const generalId = `general-${orgId}`
const reviewId = 'shell-list-review'
const laterId = 'shell-list-later'
const user: User = {
  id: 'shell-list-user',
  githubId: 1,
  githubLogin: 'list-owner',
  displayName: null,
  avatarUrl: null,
}

export function setupShellListTests() {
  let harness: TestHarness
  beforeAll(async () => {
    harness = await createHarness()
  })
  beforeEach(async () => {
    await harness.reset()
    const db = harness.env.DB
    await db.batch([
      db
        .prepare(
          `INSERT INTO users (id, github_id, github_login, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(user.id, user.githubId, user.githubLogin, TEST_TIME, TEST_TIME),
      db
        .prepare(
          `INSERT INTO orgs (id, name, creator_user_id, created_at)
           VALUES (?, 'List org', ?, ?)`,
        )
        .bind(orgId, user.id, TEST_TIME),
      db
        .prepare(
          `INSERT INTO org_members (org_id, user_id, role, joined_at)
           VALUES (?, ?, 'admin', ?)`,
        )
        .bind(orgId, user.id, TEST_TIME),
      db
        .prepare(
          `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch)
           VALUES (?, ?, 1, 'example/list', 'main')`,
        )
        .bind(repositoryId, orgId),
      ...[generalId, reviewId, laterId].map((id, position) =>
        db
          .prepare(
            `INSERT INTO sections (id, org_id, name, position, is_default, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(id, orgId, id, position, position === 0 ? 1 : 0, TEST_TIME),
      ),
    ])
  })
  afterAll(async () => {
    await harness.dispose()
  })
  return () => ({
    db: harness.env.DB,
    orgId,
    repositoryId,
    generalId,
    reviewId,
    laterId,
    user,
  })
}

export type ShellListFixture = ReturnType<
  ReturnType<typeof setupShellListTests>
>

export async function seedListWorkspaces(
  fixture: ShellListFixture,
  rows: readonly { id: string; sectionId: string; position: number }[],
) {
  const { db, orgId, repositoryId, user } = fixture
  await db.batch(
    rows.flatMap(({ id, sectionId, position }, index) => [
      db
        .prepare(
          `INSERT INTO workspaces (id, org_id, repository_id, owner_user_id,
           section_id, name, branch, state, position, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, ?)`,
        )
        .bind(
          id,
          orgId,
          repositoryId,
          user.id,
          sectionId,
          id,
          `list-owner/${id}`,
          position,
          TEST_TIME + index,
          TEST_TIME + index,
        ),
      db
        .prepare(
          `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id,
           session_id, first_turn_id, agent, model, effort, first_message_id)
           VALUES (?, ?, ?, ?, ?, 'codex', 'test-model', 'high', ?)`,
        )
        .bind(
          id,
          orgId,
          user.id,
          `session-${id}`,
          `turn-${id}`,
          `message-${id}`,
        ),
    ]),
  )
}

export function beforeFirstListBatch(
  database: D1Database,
  beforeBatch: () => Promise<void>,
) {
  let calls = 0
  const db = new Proxy(database, {
    get(target, property) {
      if (property === 'batch')
        return async <T>(statements: D1PreparedStatement[]) => {
          if (calls === 0) {
            calls += 1
            await beforeBatch()
          }
          return target.batch<T>(statements)
        }
      const value: unknown = Reflect.get(target, property)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  return { db, calls: () => calls }
}
