import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { interceptMembersWrite } from './guarded-write.test-support'
import { changeMemberRole, requireMember, removeOrgMember } from './membership'
import { memberFixture } from './members-test-support'

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

it('reports lost admin permission when a role change loses the race to demotion', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  const db = harness.env.DB
  await changeMemberRole(db, org.id, admin.user.id, member.user.id, 'admin')
  const race = interceptMembersWrite(db, () =>
    changeMemberRole(db, org.id, member.user.id, admin.user.id, 'member'),
  )
  await expect(
    changeMemberRole(race.db, org.id, admin.user.id, other.user.id, 'admin'),
  ).rejects.toMatchObject({ status: 403, code: 'admin_required' })
  expect(race.calls()).toBe(1)
  expect(await requireMember(db, org.id, other.user.id)).toMatchObject({
    role: 'member',
  })
})

it('reports the missing target when a role change loses the race to removal', async () => {
  const { org, admin, other } = await memberFixture(harness)
  const db = harness.env.DB
  const race = interceptMembersWrite(db, () =>
    removeOrgMember(db, org.id, admin.user.id, other.user.id, TEST_TIME),
  )
  await expect(
    changeMemberRole(race.db, org.id, admin.user.id, other.user.id, 'admin'),
  ).rejects.toMatchObject({ status: 404, code: 'member_not_found' })
  expect(race.calls()).toBe(1)
  await expect(requireMember(db, org.id, other.user.id)).rejects.toMatchObject({
    status: 404,
    code: 'member_not_found',
  })
})

it('reports lost org access when the removing admin loses the race to removal', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  const db = harness.env.DB
  await changeMemberRole(db, org.id, admin.user.id, member.user.id, 'admin')
  const race = interceptMembersWrite(db, () =>
    removeOrgMember(db, org.id, member.user.id, admin.user.id, TEST_TIME),
  )
  await expect(
    removeOrgMember(race.db, org.id, admin.user.id, other.user.id, TEST_TIME),
  ).rejects.toMatchObject({ status: 404, code: 'org_not_found' })
  expect(race.calls()).toBe(1)
  expect(await requireMember(db, org.id, other.user.id)).toMatchObject({
    role: 'member',
  })
})

it('reports the missing target when two admins remove the same member', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  const db = harness.env.DB
  await changeMemberRole(db, org.id, admin.user.id, member.user.id, 'admin')
  const race = interceptMembersWrite(db, () =>
    removeOrgMember(db, org.id, member.user.id, other.user.id, TEST_TIME),
  )
  await expect(
    removeOrgMember(race.db, org.id, admin.user.id, other.user.id, TEST_TIME),
  ).rejects.toMatchObject({ status: 404, code: 'member_not_found' })
  expect(race.calls()).toBe(1)
  await expect(requireMember(db, org.id, other.user.id)).rejects.toMatchObject({
    status: 404,
    code: 'member_not_found',
  })
})

it('reports lost org access when leaving loses the race to admin removal', async () => {
  const { org, admin, member } = await memberFixture(harness)
  const db = harness.env.DB
  const race = interceptMembersWrite(db, () =>
    removeOrgMember(db, org.id, admin.user.id, member.user.id, TEST_TIME),
  )
  await expect(
    removeOrgMember(race.db, org.id, member.user.id, member.user.id, TEST_TIME),
  ).rejects.toMatchObject({ status: 404, code: 'org_not_found' })
  expect(race.calls()).toBe(1)
})
