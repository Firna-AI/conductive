import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS, orgPath } from '../../src/shared/api'
import type { OrgResponse, OrgsResponse } from '../../src/shared/orgs'
import { createHarness, type TestHarness } from '../test-support/harness'
import { memberFixture, membersClient, write } from './members-test-support'

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

it('saves a colour that an admin picks alone, and every member reads it', async () => {
  const { org, admin, member } = await memberFixture(harness)
  const client = membersClient(harness)
  const saved = await client.request(
    orgPath(org.id),
    admin.session,
    write({ color: 'green' }, 'PATCH'),
  )
  expect(saved.status).toBe(200)
  expect(((await saved.json()) as OrgResponse).org).toMatchObject({
    id: org.id,
    name: org.name,
    color: 'green',
  })
  const listed = await client.request(API_PATHS.orgs, member.session)
  const orgs = ((await listed.json()) as OrgsResponse).orgs
  expect(orgs.find((item) => item.id === org.id)?.color).toBe('green')
  const read = await client.request(orgPath(org.id), member.session)
  expect(((await read.json()) as OrgResponse).org.color).toBe('green')
})

it('keeps the colour on a rename, and the name on a colour change', async () => {
  const { org, admin } = await memberFixture(harness)
  const client = membersClient(harness)
  await client.request(
    orgPath(org.id),
    admin.session,
    write({ color: 'purple' }, 'PATCH'),
  )
  const renamed = await client.request(
    orgPath(org.id),
    admin.session,
    write({ name: 'Renamed', initials: 'RN' }, 'PATCH'),
  )
  expect(((await renamed.json()) as OrgResponse).org).toEqual({
    id: org.id,
    name: 'Renamed',
    initials: 'RN',
    role: 'admin',
    color: 'purple',
  })
  const recoloured = await client.request(
    orgPath(org.id),
    admin.session,
    write({ color: 'teal' }, 'PATCH'),
  )
  expect(((await recoloured.json()) as OrgResponse).org).toEqual({
    id: org.id,
    name: 'Renamed',
    initials: 'RN',
    role: 'admin',
    color: 'teal',
  })
})

it('refuses a colour from a member and a colour that is not a preset', async () => {
  const { org, admin, member } = await memberFixture(harness)
  const client = membersClient(harness)
  const refused = await client.request(
    orgPath(org.id),
    member.session,
    write({ color: 'green' }, 'PATCH'),
  )
  expect(refused.status).toBe(403)
  for (const color of ['magenta', '', 3, null]) {
    const unknown = await client.request(
      orgPath(org.id),
      admin.session,
      write({ color }, 'PATCH'),
    )
    expect(unknown.status, String(color)).toBe(400)
  }
  const empty = await client.request(
    orgPath(org.id),
    admin.session,
    write({}, 'PATCH'),
  )
  expect(empty.status).toBe(400)
  const read = await client.request(orgPath(org.id), admin.session)
  expect(((await read.json()) as OrgResponse).org.color).toBeUndefined()
})
