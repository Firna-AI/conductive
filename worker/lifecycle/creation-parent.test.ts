import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { createWorkspace } from './workspaces'

const fixtureForTest = setupBackendTests()

it('keeps the parent and section notice through admission restart and replay', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, repositoryId } = fixture
  const db = runtime.env.DB
  const generalId = await db
    .prepare('SELECT id FROM sections WHERE org_id = ? AND is_default = 1')
    .bind(org.id)
    .first<string>('id')
  if (!generalId) throw new Error('The default section is missing.')
  await db.batch([
    db
      .prepare(
        "INSERT INTO sections (id, org_id, name, position, is_default, created_at) VALUES ('parent-section', ?, 'Parent', 1, 0, 1)",
      )
      .bind(org.id),
    db
      .prepare(
        `INSERT INTO workspaces
       (id, org_id, repository_id, owner_user_id, section_id, name, branch, state, created_at, updated_at)
       VALUES ('parent', ?, ?, ?, 'parent-section', 'Parent', 'owner/parent', 'archived', 1, 1)`,
      )
      .bind(org.id, repositoryId, user.id),
  ])
  const input = {
    repositoryId,
    parentId: 'parent',
    sectionId: generalId,
    firstMessage: FIRST_MESSAGE,
  }
  const admitted = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, input),
  )
  expect(admitted).toMatchObject({
    workspace: { parentId: 'parent', sectionId: 'parent-section' },
    notice: 'The workspace joined the section of its parent.',
  })
  const id = admitted.workspace.id
  expect(
    await db
      .prepare(
        'SELECT parent_workspace_id AS parentId FROM workspace_creation_plans WHERE workspace_id = ?',
      )
      .bind(id)
      .first(),
  ).toEqual({ parentId: 'parent' })
  const actor = fixture.starts.get(id)
  if (!actor) throw new Error('The admitted workspace is missing.')
  await actor.restart()
  const repeated = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, {
      ...input,
      parentId: 'unknown-parent',
      sectionId: 'unknown-section',
    }),
  )
  expect(repeated.workspace).toMatchObject({
    id,
    parentId: 'parent',
    sectionId: 'parent-section',
  })
  expect(repeated.notice).toBe(
    'The workspace joined the section of its parent.',
  )
  expect(repeated.first).toEqual(admitted.first)
  expect(
    await db.prepare('SELECT COUNT(*) AS count FROM workspaces').first('count'),
  ).toBe(2)
  expect(fixture.boat.starts).toEqual([])
})
