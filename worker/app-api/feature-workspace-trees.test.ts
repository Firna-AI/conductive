import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { markWorkspaceArchived } from './archive-data'
import { writeShellWorkspace } from './feature-workspaces-data'
import {
  setupShellListTests,
  type ShellListFixture,
} from './shell-list.test-support'
import {
  restoreTreeWorkspace,
  seedWorkspaceTree,
  storedTreePlaces,
  workspacePlaces,
} from './workspace-tree.test-support'

const fixtureForTest = setupShellListTests()

async function move(
  fixture: ShellListFixture,
  workspaceId: string,
  sectionId: string,
  position: number,
) {
  const result = await writeShellWorkspace(fixture.db, {
    orgId: fixture.orgId,
    userId: fixture.user.id,
    workspaceId,
    sectionId,
    position,
    now: TEST_TIME + 200,
  })
  return result.updated
}

it('moves every live and archived descendant with its top-level row', async () => {
  const fixture = fixtureForTest()
  const { generalId, reviewId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'root', sectionId: generalId, position: 0 },
    {
      id: 'middle',
      sectionId: generalId,
      position: 1,
      parentId: 'root',
      archived: true,
    },
    { id: 'child', sectionId: generalId, position: 2, parentId: 'middle' },
    { id: 'unrelated', sectionId: generalId, position: 3 },
    { id: 'target', sectionId: reviewId, position: 0 },
  ])
  expect(await move(fixture, 'root', reviewId, 0)).toBe(true)
  expect(
    (await storedTreePlaces(fixture)).map(({ id, sectionId, parentId }) => [
      id,
      sectionId,
      parentId,
    ]),
  ).toEqual([
    ['root', reviewId, null],
    ['middle', reviewId, 'root'],
    ['child', reviewId, 'middle'],
    ['unrelated', generalId, null],
    ['target', reviewId, null],
  ])
  expect(await workspacePlaces(fixture)).toEqual([
    ['unrelated', generalId, null],
    ['root', reviewId, null],
    ['child', reviewId, 'root'],
    ['target', reviewId, null],
  ])
})

it('counts only top-level rows in a move within a section', async () => {
  const fixture = fixtureForTest()
  const { generalId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'a', sectionId: generalId, position: 0 },
    { id: 'a-child', sectionId: generalId, position: 1, parentId: 'a' },
    { id: 'b', sectionId: generalId, position: 2 },
    { id: 'b-child', sectionId: generalId, position: 3, parentId: 'b' },
    { id: 'c', sectionId: generalId, position: 4 },
  ])
  expect(await move(fixture, 'a', generalId, 1)).toBe(true)
  expect(await workspacePlaces(fixture)).toEqual([
    ['b', generalId, null],
    ['b-child', generalId, 'b'],
    ['a', generalId, null],
    ['a-child', generalId, 'a'],
    ['c', generalId, null],
  ])
  expect(
    (await storedTreePlaces(fixture)).map(({ id, position }) => [id, position]),
  ).toEqual([
    ['a', 1],
    ['a-child', 1],
    ['b', 0],
    ['b-child', 3],
    ['c', 2],
  ])
})

it('restores an archived sub-workspace in the section its tree moved to', async () => {
  const fixture = fixtureForTest()
  const { generalId, reviewId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'root', sectionId: generalId, position: 0 },
    {
      id: 'child',
      sectionId: generalId,
      position: 1,
      parentId: 'root',
      archived: true,
    },
  ])
  expect(await move(fixture, 'root', reviewId, 0)).toBe(true)
  expect(await restoreTreeWorkspace(fixture, 'child')).toBe(true)
  expect(await workspacePlaces(fixture)).toEqual([
    ['root', reviewId, null],
    ['child', reviewId, 'root'],
  ])
  expect(
    (await storedTreePlaces(fixture)).map(({ id, sectionId }) => [
      id,
      sectionId,
    ]),
  ).toEqual([
    ['root', reviewId],
    ['child', reviewId],
  ])
})

it('moves a promoted tree within its section and across sections until its parent returns', async () => {
  const fixture = fixtureForTest()
  const { generalId, reviewId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'before', sectionId: generalId, position: 0 },
    { id: 'parent', sectionId: generalId, position: 1 },
    { id: 'after', sectionId: generalId, position: 2 },
    { id: 'older', sectionId: generalId, position: -2, parentId: 'parent' },
    { id: 'newer', sectionId: generalId, position: -1, parentId: 'parent' },
    { id: 'grandchild', sectionId: generalId, position: -3, parentId: 'newer' },
  ])
  await markWorkspaceArchived(
    fixture.env,
    fixture.orgId,
    'parent',
    fixture.user.id,
    TEST_TIME + 100,
  )
  expect(await move(fixture, 'newer', generalId, 0)).toBe(true)
  expect(await workspacePlaces(fixture)).toEqual([
    ['newer', generalId, null],
    ['grandchild', generalId, 'newer'],
    ['before', generalId, null],
    ['older', generalId, null],
    ['after', generalId, null],
  ])
  expect(await move(fixture, 'newer', reviewId, 0)).toBe(true)
  expect(await workspacePlaces(fixture)).toEqual([
    ['before', generalId, null],
    ['older', generalId, null],
    ['after', generalId, null],
    ['newer', reviewId, null],
    ['grandchild', reviewId, 'newer'],
  ])
  expect(await restoreTreeWorkspace(fixture, 'parent')).toBe(true)
  expect(await workspacePlaces(fixture)).toEqual([
    ['before', generalId, null],
    ['parent', generalId, null],
    ['older', generalId, 'parent'],
    ['newer', generalId, 'parent'],
    ['grandchild', generalId, 'newer'],
    ['after', generalId, null],
  ])
})
