import { afterAll, beforeAll, expect, it } from 'vitest'

import { memberFixture, seedWorkspace } from '../members/members-test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { applyMigrations } from '../test-support/migrations'

const migration = '202611130900_workspace_github_bar_states.sql'
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness({ migrationsBefore: migration })
})
afterAll(async () => {
  await harness.dispose()
})

it('keeps each copied GitHub state, renames checks passed, and accepts the bar states', async () => {
  const { org, admin } = await memberFixture(harness)
  const db = harness.env.DB
  const before = {
    running: 'checks-running',
    failed: 'checks-failed',
    passed: 'checks-passed',
    merged: 'merged',
    none: null,
  } as const
  for (const [id, summary] of Object.entries(before)) {
    await seedWorkspace(harness, org, admin.user, id)
    await db
      .prepare('UPDATE workspaces SET github_summary = ? WHERE id = ?')
      .bind(summary, id)
      .run()
  }

  await applyMigrations(db, { from: migration })

  const { results } = await db
    .prepare('SELECT id, github_summary AS github FROM workspaces ORDER BY id')
    .all<{ id: string; github: string | null }>()
  expect(results).toEqual([
    { id: 'failed', github: 'checks-failed' },
    { id: 'merged', github: 'merged' },
    { id: 'none', github: null },
    { id: 'passed', github: 'ready-to-merge' },
    { id: 'running', github: 'checks-running' },
  ])
  const write = (summary: string) =>
    db
      .prepare("UPDATE workspaces SET github_summary = ? WHERE id = 'none'")
      .bind(summary)
      .run()
  for (const summary of ['conflict', 'changes-requested', 'draft', 'blocked'])
    await write(summary)
  await expect(write('checks-passed')).rejects.toThrow(/CHECK/)
})
