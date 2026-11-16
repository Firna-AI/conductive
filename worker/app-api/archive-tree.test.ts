import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { markWorkspaceArchived } from './archive-data'
import {
  beforeFirstListBatch,
  setupShellListTests,
} from './shell-list.test-support'
import {
  seedWorkspaceTree,
  storedTreePlaces,
  workspacePlaces,
} from './workspace-tree.test-support'

const fixtureForTest = setupShellListTests()

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
    { id: 'after', sectionId: reviewId, position: 2, parentId: null },
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
      position: 1,
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
