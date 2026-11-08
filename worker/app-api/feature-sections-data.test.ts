import { expect, it } from 'vitest'

import { updateShellSection } from './feature-sections-data'
import { shellSections } from './shell-data'
import {
  beforeFirstListBatch,
  setupShellListTests,
  type ShellListFixture,
} from './shell-list.test-support'

const fixtureForTest = setupShellListTests()

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
