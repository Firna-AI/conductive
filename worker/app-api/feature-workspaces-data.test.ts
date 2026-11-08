import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { updateShellWorkspace } from './feature-workspaces-data'
import { shellWorkspaces } from './shell-data'
import {
  beforeFirstListBatch,
  seedListWorkspaces,
  setupShellListTests,
  suspendBeforeFirstListBatch,
  type ShellListFixture,
} from './shell-list.test-support'

const fixtureForTest = setupShellListTests()

function moveWorkspace(
  db: D1Database,
  fixture: ShellListFixture,
  workspaceId: string,
  sectionId: string,
  position: number,
) {
  return updateShellWorkspace(db, {
    orgId: fixture.orgId,
    userId: fixture.user.id,
    workspaceId,
    sectionId,
    position,
    now: TEST_TIME + 100,
  })
}

it('keeps an accepted move out of the target section when another workspace moves', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId, reviewId } = fixture
  await seedListWorkspaces(fixture, [
    { id: 'a', sectionId: generalId, position: 0 },
    { id: 'b', sectionId: generalId, position: 1 },
    { id: 'c', sectionId: generalId, position: 2 },
    { id: 'x', sectionId: reviewId, position: 0 },
    { id: 'y', sectionId: reviewId, position: 1 },
  ])
  let otherAccepted = false
  const intercepted = beforeFirstListBatch(db, async () => {
    otherAccepted = await moveWorkspace(db, fixture, 'b', reviewId, 0)
  })
  expect(await moveWorkspace(intercepted.db, fixture, 'c', generalId, 0)).toBe(
    true,
  )
  expect(intercepted.calls()).toBe(1)
  expect(otherAccepted).toBe(true)
  const rows = await shellWorkspaces(db, orgId, user.id)
  expect(rows.map(({ id, sectionId }) => ({ id, sectionId }))).toEqual([
    { id: 'c', sectionId: generalId },
    { id: 'a', sectionId: generalId },
    { id: 'b', sectionId: reviewId },
    { id: 'x', sectionId: reviewId },
    { id: 'y', sectionId: reviewId },
  ])
})

it('keeps both accepted moves inside the same section', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId } = fixture
  await seedListWorkspaces(fixture, [
    { id: 'a', sectionId: generalId, position: 0 },
    { id: 'b', sectionId: generalId, position: 1 },
    { id: 'c', sectionId: generalId, position: 2 },
  ])
  let otherAccepted = false
  const intercepted = beforeFirstListBatch(db, async () => {
    otherAccepted = await moveWorkspace(db, fixture, 'a', generalId, 2)
  })
  expect(await moveWorkspace(intercepted.db, fixture, 'c', generalId, 0)).toBe(
    true,
  )
  expect(intercepted.calls()).toBe(1)
  expect(otherAccepted).toBe(true)
  expect(
    (await shellWorkspaces(db, orgId, user.id)).map(({ id }) => id),
  ).toEqual(['c', 'b', 'a'])
})

it('keeps saved workspace positions when org suspension wins the move batch', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, generalId, reviewId } = fixture
  await seedListWorkspaces(fixture, [
    { id: 'a', sectionId: generalId, position: 0 },
    { id: 'b', sectionId: generalId, position: 1 },
    { id: 'c', sectionId: generalId, position: 2 },
    { id: 'x', sectionId: reviewId, position: 4 },
  ])
  const intercepted = suspendBeforeFirstListBatch(fixture)
  expect(await moveWorkspace(intercepted.db, fixture, 'c', generalId, 0)).toBe(
    false,
  )
  expect(intercepted.calls()).toBe(1)
  expect(
    await db
      .prepare('SELECT suspended_at FROM orgs WHERE id = ?')
      .bind(orgId)
      .first('suspended_at'),
  ).toBe(TEST_TIME + 100)
  expect(await storedWorkspacePositions(fixture)).toEqual([
    { id: 'a', sectionId: generalId, position: 0 },
    { id: 'b', sectionId: generalId, position: 1 },
    { id: 'c', sectionId: generalId, position: 2 },
    { id: 'x', sectionId: reviewId, position: 4 },
  ])
})

it('moves within the current section when a position-only move follows a cross-section move', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId, reviewId } = fixture
  await seedListWorkspaces(fixture, [
    { id: 'a', sectionId: generalId, position: 0 },
    { id: 'b', sectionId: generalId, position: 1 },
    { id: 'c', sectionId: generalId, position: 2 },
    { id: 'x', sectionId: reviewId, position: 0 },
    { id: 'y', sectionId: reviewId, position: 1 },
  ])
  let otherAccepted = false
  const intercepted = beforeFirstListBatch(db, async () => {
    otherAccepted = await moveWorkspace(db, fixture, 'c', reviewId, 1)
  })
  expect(
    await updateShellWorkspace(intercepted.db, {
      orgId,
      userId: user.id,
      workspaceId: 'c',
      position: 0,
      now: TEST_TIME + 200,
    }),
  ).toBe(true)
  expect(intercepted.calls()).toBe(1)
  expect(otherAccepted).toBe(true)
  expect(await storedWorkspacePositions(fixture)).toEqual([
    { id: 'a', sectionId: generalId, position: 0 },
    { id: 'b', sectionId: generalId, position: 1 },
    { id: 'c', sectionId: reviewId, position: 0 },
    { id: 'x', sectionId: reviewId, position: 1 },
    { id: 'y', sectionId: reviewId, position: 2 },
  ])
})

async function storedWorkspacePositions(fixture: ShellListFixture) {
  const { results } = await fixture.db
    .prepare(
      `SELECT w.id, w.section_id AS sectionId, w.position
       FROM workspaces w JOIN sections s ON s.id = w.section_id
       WHERE w.org_id = ? ORDER BY s.position, w.position, w.created_at, w.id`,
    )
    .bind(fixture.orgId)
    .all<{ id: string; sectionId: string; position: number }>()
  return results
}
