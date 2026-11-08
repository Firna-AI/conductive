import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { updateShellWorkspace } from './feature-workspaces-data'
import { shellWorkspaces } from './shell-data'
import {
  beforeFirstListBatch,
  seedListWorkspaces,
  setupShellListTests,
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
