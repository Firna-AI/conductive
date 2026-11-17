import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { markWorkspaceArchived } from './archive-data'
import { writeShellWorkspace } from './feature-workspaces-data'
import {
  beforeFirstListBatch,
  setupShellListTests,
  type ShellListFixture,
} from './shell-list.test-support'
import {
  createTreeWorkspace,
  restoreTreeWorkspace,
  seedWorkspaceTree,
  storedTreePlaces,
  workspacePlaces,
} from './workspace-tree.test-support'

const fixtureForTest = setupShellListTests()

async function move(
  fixture: ShellListFixture,
  db: D1Database,
  workspaceId: string,
  sectionId: string,
  position: number,
) {
  const result = await writeShellWorkspace(db, {
    orgId: fixture.orgId,
    userId: fixture.user.id,
    workspaceId,
    sectionId,
    position,
    now: TEST_TIME + 200,
  })
  return result.updated
}

function archive(fixture: ShellListFixture, id: string, db = fixture.db) {
  return markWorkspaceArchived(
    { ...fixture.env, DB: db },
    fixture.orgId,
    id,
    fixture.user.id,
    TEST_TIME + 200,
  )
}

it('keeps a concurrent create first when a move ranks rows starting at place one', async () => {
  const fixture = fixtureForTest()
  const { db, generalId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'a', sectionId: generalId, position: 1 },
    { id: 'b', sectionId: generalId, position: 2 },
  ])
  const intercepted = beforeFirstListBatch(db, () =>
    createTreeWorkspace(fixture, 'new', generalId),
  )
  expect(await move(fixture, intercepted.db, 'a', generalId, 1)).toBe(true)
  expect(intercepted.calls()).toBe(1)
  expect(await workspacePlaces(fixture)).toEqual([
    ['new', generalId, null],
    ['a', generalId, null],
    ['b', generalId, null],
  ])
})

it('keeps the grandchild at the parent place when parent and child Archives overlap', async () => {
  const fixture = fixtureForTest()
  const { db, generalId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'before', sectionId: generalId, position: 0 },
    { id: 'parent', sectionId: generalId, position: 1 },
    { id: 'after', sectionId: generalId, position: 2 },
    { id: 'child', sectionId: generalId, position: -1, parentId: 'parent' },
    { id: 'grandchild', sectionId: generalId, position: -2, parentId: 'child' },
  ])
  const intercepted = beforeFirstListBatch(db, () => archive(fixture, 'child'))
  await archive(fixture, 'parent', intercepted.db)
  expect(intercepted.calls()).toBe(1)
  expect(await workspacePlaces(fixture)).toEqual([
    ['before', generalId, null],
    ['grandchild', generalId, null],
    ['after', generalId, null],
  ])
})

it('keeps a promoted child after the moved row when Archive overlaps a section move', async () => {
  const fixture = fixtureForTest()
  const { db, generalId, reviewId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'before', sectionId: reviewId, position: 0 },
    { id: 'parent', sectionId: reviewId, position: 1 },
    { id: 'after', sectionId: reviewId, position: 2 },
    { id: 'child', sectionId: reviewId, position: -1, parentId: 'parent' },
    { id: 'moving', sectionId: generalId, position: 0 },
  ])
  const intercepted = beforeFirstListBatch(db, () => archive(fixture, 'parent'))
  expect(await move(fixture, intercepted.db, 'moving', reviewId, 1)).toBe(true)
  expect(intercepted.calls()).toBe(1)
  expect(await workspacePlaces(fixture)).toEqual([
    ['before', reviewId, null],
    ['moving', reviewId, null],
    ['child', reviewId, null],
    ['after', reviewId, null],
  ])
})

it('restores a child created during its tree move in the destination section', async () => {
  const fixture = fixtureForTest()
  const { db, generalId, reviewId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'parent', sectionId: generalId, position: 0 },
  ])
  const intercepted = beforeFirstListBatch(db, () =>
    createTreeWorkspace(fixture, 'child', generalId, 'parent'),
  )
  const result = await writeShellWorkspace(intercepted.db, {
    orgId: fixture.orgId,
    userId: fixture.user.id,
    workspaceId: 'parent',
    sectionId: reviewId,
    position: 0,
    now: TEST_TIME + 200,
  })
  expect(result.updated).toBe(true)
  expect(result.workspaceIds.sort()).toEqual(['child', 'parent'])
  expect(intercepted.calls()).toBe(1)
  await archive(fixture, 'child')
  await archive(fixture, 'parent')
  expect(await restoreTreeWorkspace(fixture, 'child')).toBe(true)
  expect(await workspacePlaces(fixture)).toEqual([['child', reviewId, null]])
  expect(
    (await storedTreePlaces(fixture)).map(({ id, sectionId }) => [
      id,
      sectionId,
    ]),
  ).toEqual([
    ['parent', reviewId],
    ['child', reviewId],
  ])
})
