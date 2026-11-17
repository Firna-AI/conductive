import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { deleteShellSection, updateShellSection } from './feature-sections-data'
import { shellSections } from './shell-data'
import {
  beforeFirstListBatch,
  setupShellListTests,
  suspendBeforeFirstListBatch,
  type ShellListFixture,
} from './shell-list.test-support'
import {
  seedWorkspaceTree,
  storedTreePlaces,
  workspacePlaces,
} from './workspace-tree.test-support'

const fixtureForTest = setupShellListTests()

it('deletes a section with a tree and keeps its live and archived workspaces in General', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId, reviewId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'general-root', sectionId: generalId, position: 0 },
    { id: 'tree-root', sectionId: reviewId, position: 0 },
    {
      id: 'middle',
      sectionId: reviewId,
      position: 1,
      parentId: 'tree-root',
      archived: true,
    },
    { id: 'child', sectionId: reviewId, position: 2, parentId: 'middle' },
  ])
  const result = await deleteShellSection(db, {
    orgId,
    userId: user.id,
    sectionId: reviewId,
    now: TEST_TIME + 100,
  })
  expect(result.deleted).toBe(true)
  expect(result.workspaceIds.sort()).toEqual(['child', 'middle', 'tree-root'])
  expect(
    (await storedTreePlaces(fixture)).map(({ id, sectionId, parentId }) => [
      id,
      sectionId,
      parentId,
    ]),
  ).toEqual([
    ['general-root', generalId, null],
    ['tree-root', generalId, null],
    ['middle', generalId, 'tree-root'],
    ['child', generalId, 'middle'],
  ])
  expect(await workspacePlaces(fixture)).toEqual([
    ['general-root', generalId, null],
    ['tree-root', generalId, null],
    ['child', generalId, 'tree-root'],
  ])
})

function moveSection(
  db: D1Database,
  fixture: ShellListFixture,
  sectionId: string,
  position: number,
) {
  return updateShellSection(db, {
    orgId: fixture.orgId,
    userId: fixture.user.id,
    sectionId,
    position,
  })
}

it('keeps an accepted section move when another section moves', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId, reviewId, laterId } = fixture
  let otherAccepted = false
  const intercepted = beforeFirstListBatch(db, async () => {
    otherAccepted = await moveSection(db, fixture, reviewId, 0)
  })
  expect(await moveSection(intercepted.db, fixture, laterId, 1)).toBe(true)
  expect(intercepted.calls()).toBe(1)
  expect(otherAccepted).toBe(true)
  expect(
    (await shellSections(db, orgId, user.id)).map(({ id, position }) => ({
      id,
      position,
    })),
  ).toEqual([
    { id: reviewId, position: 0 },
    { id: laterId, position: 1 },
    { id: generalId, position: 2 },
  ])
})

it('keeps saved section positions when org suspension wins the move batch', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId, reviewId, laterId } = fixture
  const intercepted = suspendBeforeFirstListBatch(fixture)
  expect(await moveSection(intercepted.db, fixture, laterId, 0)).toBe(false)
  expect(intercepted.calls()).toBe(1)
  expect(
    await db
      .prepare('SELECT suspended_at FROM orgs WHERE id = ?')
      .bind(orgId)
      .first('suspended_at'),
  ).toBe(TEST_TIME + 100)
  expect(
    (await shellSections(db, orgId, user.id)).map(({ id, position }) => ({
      id,
      position,
    })),
  ).toEqual([
    { id: generalId, position: 0 },
    { id: reviewId, position: 1 },
    { id: laterId, position: 2 },
  ])
})
