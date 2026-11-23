import { expect, it } from 'vitest'
import { queueId } from '../merge-queue/contracts'
import { TEST_TIME } from '../test-support/harness'
import {
  readWorkspaceMove,
  readWorkspaceTree,
  updateShellWorkspace,
} from './feature-workspaces-data'
import {
  setupShellListTests,
  type ShellListFixture,
} from './shell-list.test-support'
import { writeWorkspaceParentChange } from './workspace-parent-change-data'
import {
  seedWorkspaceTree,
  storedTreePlaces,
} from './workspace-tree.test-support'

const fixtureForTest = setupShellListTests()

async function queued(f: ShellListFixture, workspaceId: string) {
  const queue = queueId({ orgId: f.orgId, githubRepositoryId: 1 })
  await f.db.batch([
    f.db
      .prepare(
        `INSERT INTO merge_queues (id, org_id, repository_id, github_repository_id,
      trunk, created_at, updated_at) VALUES (?, ?, ?, 1, 'main', ?, ?)`,
      )
      .bind(queue, f.orgId, f.repositoryId, TEST_TIME, TEST_TIME),
    f.db
      .prepare(
        `INSERT INTO merge_queue_entries (workspace_id, queue_id, branch,
      pull_number, queuer_user_id, place, unit_id, state, queued_at, step_at)
      SELECT id, ?, branch, 8, ?, 1, 'unit', 'queued', ?, ? FROM workspaces WHERE id = ?`,
      )
      .bind(queue, f.user.id, TEST_TIME, TEST_TIME, workspaceId),
  ])
}

function move(f: ShellListFixture, workspaceId: string, position: number) {
  return updateShellWorkspace(f.db, {
    orgId: f.orgId,
    userId: f.user.id,
    workspaceId,
    position,
    sectionId: f.reviewId,
    now: TEST_TIME + 100,
  })
}

async function shown(f: ShellListFixture, sectionId: string) {
  const tree = await readWorkspaceTree(f.db, f.orgId)
  return tree.rows
    .filter((row) => row.sectionId === sectionId)
    .map(({ workspace, parentId }) => [workspace.id, parentId])
}

it('counts only shown roots for the destination index', async () => {
  const f = fixtureForTest()
  await seedWorkspaceTree(f, [
    { id: 'queued', sectionId: f.reviewId, position: 0 },
    { id: 'before', sectionId: f.reviewId, position: 1 },
    { id: 'after', sectionId: f.reviewId, position: 2 },
    { id: 'moving', sectionId: f.generalId, position: 0 },
  ])
  await queued(f, 'queued')
  expect(await move(f, 'moving', 1)).toBe(true)
  expect(await shown(f, f.reviewId)).toEqual([
    ['before', null],
    ['moving', null],
    ['after', null],
  ])
})

it('moves a shown root with its descendants and restores its nesting after the parent leaves', async () => {
  const f = fixtureForTest()
  await seedWorkspaceTree(f, [
    { id: 'queued', sectionId: f.generalId, position: 0 },
    { id: 'child', sectionId: f.generalId, position: 1, parentId: 'queued' },
    {
      id: 'grandchild',
      sectionId: f.generalId,
      position: 2,
      parentId: 'child',
    },
    { id: 'before', sectionId: f.reviewId, position: 0 },
    { id: 'after', sectionId: f.reviewId, position: 1 },
  ])
  await queued(f, 'queued')
  expect(await readWorkspaceMove(f.db, f.orgId, 'child')).toMatchObject({
    root: { id: 'child' },
    nested: false,
  })
  expect(await move(f, 'child', 1)).toBe(true)
  expect(await shown(f, f.reviewId)).toEqual([
    ['before', null],
    ['child', null],
    ['grandchild', 'child'],
    ['after', null],
  ])
  expect(
    (await storedTreePlaces(f)).find(({ id }) => id === 'child'),
  ).toMatchObject({ sectionId: f.reviewId, parentId: 'queued' })
  await f.db
    .prepare('DELETE FROM merge_queue_entries WHERE workspace_id = ?')
    .bind('queued')
    .run()
  expect(await shown(f, f.generalId)).toEqual([
    ['queued', null],
    ['child', 'queued'],
    ['grandchild', 'child'],
  ])
})

it('keeps a queued row out of the section order during an agent move', async () => {
  const f = fixtureForTest()
  await seedWorkspaceTree(f, [
    { id: 'queued', sectionId: f.generalId, position: 8 },
    { id: 'child', sectionId: f.generalId, position: 0, parentId: 'queued' },
    { id: 'first', sectionId: f.reviewId, position: 3 },
  ])
  await queued(f, 'queued')
  await updateShellWorkspace(f.db, {
    orgId: f.orgId,
    userId: f.user.id,
    workspaceId: 'queued',
    sectionId: f.reviewId,
    now: TEST_TIME + 100,
    keepCurrentSection: true,
  })
  expect(await shown(f, f.generalId)).toEqual([['child', null]])
  expect(await shown(f, f.reviewId)).toEqual([['first', null]])
  await writeWorkspaceParentChange(f.db, {
    orgId: f.orgId,
    userId: f.user.id,
    workspaceId: 'queued',
    target: { kind: 'parent', id: 'first' },
    now: TEST_TIME + 200,
  })
  expect(await shown(f, f.reviewId)).toEqual([
    ['first', null],
    ['child', 'first'],
  ])
  expect(
    (await storedTreePlaces(f)).find(({ id }) => id === 'queued'),
  ).toMatchObject({ parentId: 'first', position: 8, sectionId: f.reviewId })
})
