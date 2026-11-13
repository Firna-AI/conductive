import { expect, it } from 'vitest'

import { createHarness } from '../test-support/harness'
import { applyMigrations } from '../test-support/migrations'
import { accountNewWorkspaceView } from './account-data'

const migration = '202611121200_new_workspace_view_existing.sql'

it('keeps the page for existing accounts and gives new accounts the dialog', async () => {
  const harness = await createHarness({ migrationsBefore: migration })
  const db = harness.env.DB
  try {
    await db.batch([
      db.prepare(
        `INSERT INTO users (id, github_id, github_login, created_at, updated_at)
         VALUES ('unset', 1, 'unset', 1, 2), ('model', 2, 'model', 3, 4),
                ('dialog', 3, 'dialog', 5, 6), ('page', 4, 'page', 7, 8)`,
      ),
      db.prepare(
        `INSERT INTO user_preferences
         (user_id, default_agent, default_model, default_effort, new_workspace_view, updated_at)
         VALUES ('model', 'claude', 'opus', 'high', NULL, 11),
                ('dialog', NULL, NULL, NULL, 'dialog', 12),
                ('page', NULL, NULL, NULL, 'page', 13)`,
      ),
    ])

    await applyMigrations(db, { from: migration })
    await db
      .prepare(
        `INSERT INTO users (id, github_id, github_login, created_at, updated_at)
         VALUES ('new', 5, 'new', 9, 10)`,
      )
      .run()

    const { results } = await db
      .prepare(
        `SELECT user_id, default_model, new_workspace_view, updated_at
         FROM user_preferences ORDER BY user_id`,
      )
      .all<{
        user_id: string
        default_model: string | null
        new_workspace_view: string | null
        updated_at: number
      }>()
    expect(
      results.map((row) => ({
        user_id: row.user_id,
        default_model: row.default_model,
        new_workspace_view: row.new_workspace_view,
      })),
    ).toEqual([
      { user_id: 'dialog', default_model: null, new_workspace_view: 'dialog' },
      { user_id: 'model', default_model: 'opus', new_workspace_view: 'page' },
      { user_id: 'page', default_model: null, new_workspace_view: 'page' },
      { user_id: 'unset', default_model: null, new_workspace_view: 'page' },
    ])
    const updated = Object.fromEntries(
      results.map((row) => [row.user_id, row.updated_at]),
    )
    expect(updated).toMatchObject({ dialog: 12, model: 11, page: 13 })
    expect(updated.unset).toBeGreaterThan(1_700_000_000_000)

    const views = await Promise.all(
      ['unset', 'model', 'dialog', 'page', 'new'].map((id) =>
        accountNewWorkspaceView(db, id),
      ),
    )
    expect(views).toEqual(['page', 'page', 'dialog', 'page', 'dialog'])
  } finally {
    await harness.dispose()
  }
})
