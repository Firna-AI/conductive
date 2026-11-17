import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { markWorkspaceArchived } from './archive-data'
import {
  beforeFirstListBatch,
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

function archive(fixture: ShellListFixture, id: string) {
  return markWorkspaceArchived(
    fixture.env,
    fixture.orgId,
    id,
    fixture.user.id,
    TEST_TIME + 100,
  )
}

it('gives the archived row place to its first live descendants through archived rows', async () => {
  const fixture = fixtureForTest()
  const { generalId, reviewId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'before', sectionId: reviewId, position: 0 },
    { id: 'root', sectionId: reviewId, position: 1 },
    { id: 'after', sectionId: reviewId, position: 2 },
    { id: 'live-child', sectionId: generalId, position: -1, parentId: 'root' },
    {
      id: 'archived-child',
      sectionId: generalId,
      position: -2,
      parentId: 'root',
      archived: true,
    },
    {
      id: 'promoted-grandchild',
      sectionId: generalId,
      position: -3,
      parentId: 'archived-child',
    },
    {
      id: 'nested-grandchild',
      sectionId: generalId,
      position: -4,
      parentId: 'live-child',
    },
  ])
  await markWorkspaceArchived(
    fixture.env,
    fixture.orgId,
    'root',
    fixture.user.id,
    TEST_TIME + 100,
  )
  expect(await storedTreePlaces(fixture)).toEqual([
    { id: 'before', sectionId: reviewId, position: 0, parentId: null },
    { id: 'root', sectionId: reviewId, position: 1, parentId: null },
    { id: 'after', sectionId: reviewId, position: 3, parentId: null },
    { id: 'live-child', sectionId: reviewId, position: 1, parentId: 'root' },
    {
      id: 'archived-child',
      sectionId: generalId,
      position: -2,
      parentId: 'root',
    },
    {
      id: 'promoted-grandchild',
      sectionId: reviewId,
      position: 2,
      parentId: 'archived-child',
    },
    {
      id: 'nested-grandchild',
      sectionId: generalId,
      position: -4,
      parentId: 'live-child',
    },
  ])
  expect(await workspacePlaces(fixture)).toEqual([
    ['before', reviewId, null],
    ['live-child', reviewId, null],
    ['nested-grandchild', reviewId, 'live-child'],
    ['promoted-grandchild', reviewId, null],
    ['after', reviewId, null],
  ])
})

it('keeps the surviving tree order on a fresh read after repeated Archives', async () => {
  const fixture = fixtureForTest()
  const { generalId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'before', sectionId: generalId, position: 0 },
    { id: 'root', sectionId: generalId, position: 1 },
    { id: 'after', sectionId: generalId, position: 2 },
    { id: 'a', sectionId: generalId, position: -1, parentId: 'root' },
    { id: 'b', sectionId: generalId, position: -2, parentId: 'root' },
    { id: 'aa', sectionId: generalId, position: -3, parentId: 'a' },
  ])
  await archive(fixture, 'root')
  await archive(fixture, 'a')
  expect(await workspacePlaces(fixture)).toEqual([
    ['before', generalId, null],
    ['aa', generalId, null],
    ['b', generalId, null],
    ['after', generalId, null],
  ])
})

it('restores the archived parent at its saved place after repeated Archives', async () => {
  const fixture = fixtureForTest()
  const { generalId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'before', sectionId: generalId, position: 5 },
    { id: 'root', sectionId: generalId, position: 9 },
    { id: 'after', sectionId: generalId, position: 12 },
    { id: 'a', sectionId: generalId, position: -1, parentId: 'root' },
    { id: 'b', sectionId: generalId, position: -2, parentId: 'root' },
    { id: 'aa', sectionId: generalId, position: -3, parentId: 'a' },
  ])
  await archive(fixture, 'root')
  await archive(fixture, 'a')
  expect(await restoreTreeWorkspace(fixture, 'a')).toBe(true)
  expect(await storedTreePlaces(fixture)).toEqual([
    { id: 'before', sectionId: generalId, position: 5, parentId: null },
    { id: 'root', sectionId: generalId, position: 9, parentId: null },
    { id: 'after', sectionId: generalId, position: 13, parentId: null },
    { id: 'a', sectionId: generalId, position: 9, parentId: 'root' },
    { id: 'b', sectionId: generalId, position: 10, parentId: 'root' },
    { id: 'aa', sectionId: generalId, position: 9, parentId: 'a' },
  ])
  expect(await workspacePlaces(fixture)).toEqual([
    ['before', generalId, null],
    ['a', generalId, null],
    ['aa', generalId, 'a'],
    ['b', generalId, null],
    ['after', generalId, null],
  ])
})

it('keeps an earlier archived row in place when Restore follows another Archive', async () => {
  const fixture = fixtureForTest()
  const { generalId, reviewId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'before', sectionId: generalId, position: 5, archived: true },
    { id: 'earlier', sectionId: generalId, position: 12, archived: true },
    { id: 'root', sectionId: generalId, position: 9 },
    { id: 'after', sectionId: generalId, position: 13 },
    { id: 'a', sectionId: generalId, position: -1, parentId: 'root' },
    { id: 'b', sectionId: generalId, position: -2, parentId: 'root' },
    { id: 'aa', sectionId: generalId, position: -3, parentId: 'a' },
    { id: 'other-section', sectionId: reviewId, position: 12 },
  ])
  await archive(fixture, 'root')
  await archive(fixture, 'a')
  expect(await restoreTreeWorkspace(fixture, 'earlier')).toBe(true)
  expect(
    (await storedTreePlaces(fixture)).map(({ id, position }) => [id, position]),
  ).toEqual([
    ['before', 5],
    ['earlier', 13],
    ['root', 9],
    ['after', 14],
    ['a', 9],
    ['b', 10],
    ['aa', 9],
    ['other-section', 12],
  ])
  expect(await workspacePlaces(fixture)).toEqual([
    ['aa', generalId, null],
    ['b', generalId, null],
    ['earlier', generalId, null],
    ['after', generalId, null],
    ['other-section', reviewId, null],
  ])
})

it('keeps descendant places when member suspension prevents the Archive write', async () => {
  const fixture = fixtureForTest()
  const { db, generalId, reviewId, orgId, user } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'root', sectionId: reviewId, position: 9 },
    { id: 'child', sectionId: generalId, position: -1, parentId: 'root' },
  ])
  const intercepted = beforeFirstListBatch(db, async () => {
    await db
      .prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
      .bind(TEST_TIME + 100, user.id)
      .run()
  })
  await markWorkspaceArchived(
    { ...fixture.env, DB: intercepted.db },
    orgId,
    'root',
    user.id,
    TEST_TIME + 100,
  )
  expect(intercepted.calls()).toBe(1)
  expect(
    await db
      .prepare(
        "SELECT archived_at AS archivedAt, state FROM workspaces WHERE id = 'root'",
      )
      .first(),
  ).toEqual({ archivedAt: null, state: 'ready' })
  expect(await storedTreePlaces(fixture)).toEqual([
    { id: 'root', sectionId: reviewId, position: 9, parentId: null },
    { id: 'child', sectionId: generalId, position: -1, parentId: 'root' },
  ])
})
