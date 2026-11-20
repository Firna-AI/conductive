import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { workspaceParent } from '../tools/workspace-parent-data'
import {
  beforeFirstListBatch,
  setupShellListTests,
  suspendBeforeFirstListBatch,
  type ShellListFixture,
} from './shell-list.test-support'
import { writeWorkspaceParentChange } from './workspace-parent-change-data'
import {
  createTreeWorkspace,
  seedWorkspaceTree,
  storedTreePlaces,
} from './workspace-tree.test-support'

const fixtureForTest = setupShellListTests()

function nest(
  fixture: ShellListFixture,
  id: string,
  parentId: string,
  db = fixture.db,
) {
  return writeWorkspaceParentChange(db, {
    orgId: fixture.orgId,
    userId: fixture.user.id,
    workspaceId: id,
    target: { kind: 'parent', id: parentId },
    now: TEST_TIME + 200,
  })
}

it('rejects the second crossing move from current rows without making a loop', async () => {
  const fixture = fixtureForTest()
  const { db, generalId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'one', sectionId: generalId, position: 0 },
    { id: 'two', sectionId: generalId, position: 1 },
  ])
  const racing = beforeFirstListBatch(db, async () => {
    await nest(fixture, 'two', 'one')
  })
  await expect(nest(fixture, 'one', 'two', racing.db)).rejects.toMatchObject({
    status: 409,
    code: 'nesting_cycle',
  })
  expect(racing.calls()).toBe(1)
  expect(
    (await storedTreePlaces(fixture)).map(({ id, parentId }) => [id, parentId]),
  ).toEqual([
    ['one', null],
    ['two', 'one'],
  ])
})

it('rechecks target depth when another move happens before the batch', async () => {
  const fixture = fixtureForTest()
  const { db, generalId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'root', sectionId: generalId, position: 0 },
    { id: 'middle', sectionId: generalId, position: 1, parentId: 'root' },
    { id: 'target', sectionId: generalId, position: 2 },
    { id: 'moving', sectionId: generalId, position: 3 },
    { id: 'child', sectionId: generalId, position: 4, parentId: 'moving' },
  ])
  const racing = beforeFirstListBatch(db, async () => {
    await nest(fixture, 'target', 'middle')
  })
  await expect(
    nest(fixture, 'moving', 'target', racing.db),
  ).rejects.toMatchObject({
    status: 409,
    code: 'nesting_limit',
    message:
      'W-5 is the deepest workspace in the moved tree. Choose a parent at depth 1 or less.',
  })
  expect(await workspaceParent(db, fixture.orgId, 'moving')).toEqual({
    number: 4,
    parentId: null,
    depth: 0,
  })
})

it('counts a pending create under the moved tree and ignores a failed create', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, repositoryId, generalId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'root', sectionId: generalId, position: 0 },
    { id: 'middle', sectionId: generalId, position: 1, parentId: 'root' },
    { id: 'target', sectionId: generalId, position: 2, parentId: 'middle' },
    { id: 'moving', sectionId: generalId, position: 3 },
  ])
  await db.batch([
    db
      .prepare(
        `INSERT INTO workspace_creation_attempts (workspace_id, org_id, sender_user_id, first_message_id, created_at)
      VALUES ('pending', ?, ?, 'pending-message', ?)`,
      )
      .bind(orgId, user.id, TEST_TIME),
    db
      .prepare(
        `INSERT INTO workspace_creation_plans (workspace_id, repository_id, owner_user_id, session_id,
      turn_id, city, branch, start_attempt, startup_script, default_branch, agent, model, effort, attachment_ids_json, parent_workspace_id)
      VALUES ('pending', ?, ?, 'pending-session', 'pending-turn', 'Lisbon', 'pending-branch', 'attempt', '', 'main', 'codex', 'test-model', 'high', '[]', 'moving')`,
      )
      .bind(repositoryId, user.id),
  ])
  const before = await storedTreePlaces(fixture)
  await expect(nest(fixture, 'moving', 'target')).rejects.toMatchObject({
    status: 409,
    code: 'nesting_limit',
  })
  expect(await storedTreePlaces(fixture)).toEqual(before)
  await db
    .prepare(
      "UPDATE workspace_creation_attempts SET state = 'failed' WHERE workspace_id = 'pending'",
    )
    .run()
  expect(await nest(fixture, 'moving', 'target')).toEqual({
    updated: true,
    workspaceIds: ['moving'],
  })
})

it('refuses the insert when a move deepens its parent after the first create check', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, generalId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'root', sectionId: generalId, position: 0 },
    { id: 'middle', sectionId: generalId, position: 1, parentId: 'root' },
    { id: 'target', sectionId: generalId, position: 2, parentId: 'middle' },
    { id: 'parent', sectionId: generalId, position: 3 },
  ])
  expect(await workspaceParent(db, orgId, 'parent')).toEqual({
    number: 4,
    parentId: null,
    depth: 0,
  })
  const racing = beforeFirstListBatch(db, async () => {
    await nest(fixture, 'parent', 'target')
  })
  await expect(
    createTreeWorkspace(
      { ...fixture, db: racing.db },
      'new',
      generalId,
      'parent',
    ),
  ).rejects.toMatchObject({
    status: 409,
    code: 'nesting_limit',
    message:
      'W-4 is at the deepest level. Create a sibling instead. Pass parentId "target". Start the name with a one-word group prefix, such as "Limits: ".',
  })
  expect(
    await db.prepare("SELECT id FROM workspaces WHERE id = 'new'").first(),
  ).toBeNull()
  expect(
    await db
      .prepare(
        "SELECT workspace_id FROM workspace_runtime WHERE workspace_id = 'new'",
      )
      .first(),
  ).toBeNull()
})

it('keeps every placement and timestamp when org suspension wins a detachment batch', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId, reviewId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'root', sectionId: generalId, position: 0 },
    { id: 'moving', sectionId: generalId, position: 1, parentId: 'root' },
    { id: 'child', sectionId: generalId, position: 2, parentId: 'moving' },
    { id: 'first', sectionId: reviewId, position: 0 },
    { id: 'second', sectionId: reviewId, position: 1 },
  ])
  const stored = async () => ({
    places: await storedTreePlaces(fixture),
    timestamps: (
      await db
        .prepare(
          'SELECT id, updated_at AS updatedAt FROM workspaces WHERE org_id = ? ORDER BY id',
        )
        .bind(orgId)
        .all<{ id: string; updatedAt: number }>()
    ).results,
  })
  const before = await stored()
  const intercepted = suspendBeforeFirstListBatch(fixture)
  const result = await writeWorkspaceParentChange(intercepted.db, {
    orgId,
    userId: user.id,
    workspaceId: 'moving',
    sectionId: reviewId,
    target: { kind: 'top-level' },
    now: TEST_TIME + 200,
  })
  expect(intercepted.calls()).toBe(1)
  expect.soft(result).toEqual({ updated: false, workspaceIds: [] })
  expect(await stored()).toEqual(before)
})
