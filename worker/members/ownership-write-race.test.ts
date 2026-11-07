import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { interceptMembersWrite } from './guarded-write.test-support'
import { changeMemberRole, removeOrgMember } from './membership'
import {
  memberFixture,
  membersClient,
  seedWorkspace,
} from './members-test-support'
import { reassignWorkspace } from './ownership'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('reports lost admin permission when owner reassignment loses the race to demotion', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  const db = harness.env.DB
  const id = await seedWorkspace(harness, org, member.user)
  const { hooks } = membersClient(harness)
  const before = await hooks.readWorkspace(org.id, id, admin.user.id)
  await changeMemberRole(db, org.id, admin.user.id, member.user.id, 'admin')
  const race = interceptMembersWrite(db, () =>
    changeMemberRole(db, org.id, member.user.id, admin.user.id, 'member'),
  )
  await expect(
    reassignWorkspace(
      race.db,
      org.id,
      admin.user.id,
      id,
      other.user.id,
      TEST_TIME + 1,
      hooks,
    ),
  ).rejects.toMatchObject({ status: 403, code: 'admin_required' })
  expect(race.calls()).toBe(1)
  expect(await hooks.readWorkspace(org.id, id, member.user.id)).toEqual(before)
})

it('reports the missing member when owner reassignment loses its new owner to removal', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  const db = harness.env.DB
  const id = await seedWorkspace(harness, org, member.user)
  const { hooks } = membersClient(harness)
  const before = await hooks.readWorkspace(org.id, id, admin.user.id)
  const race = interceptMembersWrite(db, () =>
    removeOrgMember(db, org.id, admin.user.id, other.user.id, TEST_TIME),
  )
  await expect(
    reassignWorkspace(
      race.db,
      org.id,
      admin.user.id,
      id,
      other.user.id,
      TEST_TIME + 1,
      hooks,
    ),
  ).rejects.toMatchObject({ status: 404, code: 'member_not_found' })
  expect(race.calls()).toBe(1)
  expect(await hooks.readWorkspace(org.id, id, admin.user.id)).toEqual(before)
})
