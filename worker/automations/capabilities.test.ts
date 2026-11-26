import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  automationPath,
  automationsPath,
  type AutomationResponse,
  type AutomationsResponse,
} from '../../src/shared/automations'
import { write } from '../members/members-test-support'
import { deleteSecret } from '../secrets/writes'
import { createHarness, type TestHarness } from '../test-support/harness'
import { automationSecret } from './capabilities.test-support'
import { automationFixture } from './routes.test-support'

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

it('saves and reads chosen org secrets, drops unknown IDs, and keeps choices when an update omits them', async () => {
  const { org, member, other, create } = await automationFixture(harness)
  const db = harness.env.DB
  await automationSecret(db, org.id, member.user.id, 'chosen-secret')
  await automationSecret(db, org.id, member.user.id, 'replacement-secret')
  const foreign = await harness.createOrg(member.session, 'Other org')
  await automationSecret(db, foreign.id, member.user.id, 'foreign-secret')
  expect((await create()).capabilities).toEqual({ preapprovedSecretIds: [] })
  const created = await create({
    capabilities: {
      preapprovedSecretIds: [
        'chosen-secret',
        'unknown',
        'foreign-secret',
        'chosen-secret',
      ],
    },
  })
  expect(created.capabilities).toEqual({
    preapprovedSecretIds: ['chosen-secret'],
  })
  const path = automationPath(org.id, created.id)
  const read: AutomationResponse = await (
    await harness.request(path, other.session)
  ).json()
  expect(read.automation.capabilities).toEqual({
    preapprovedSecretIds: ['chosen-secret'],
  })
  const listed: AutomationsResponse = await (
    await harness.request(automationsPath(org.id), other.session)
  ).json()
  expect(
    listed.automations.find((item) => item.id === created.id)?.capabilities,
  ).toEqual({
    preapprovedSecretIds: ['chosen-secret'],
  })
  for (const body of [
    { capabilities: { preapprovedSecretIds: ['replacement-secret'] } },
    { name: 'Renamed with an older app' },
  ]) {
    const updated = await harness.request(
      path,
      member.session,
      write(body, 'PATCH'),
    )
    expect(updated.status).toBe(200)
    expect(await updated.json()).toMatchObject({
      automation: {
        capabilities: { preapprovedSecretIds: ['replacement-secret'] },
      },
    })
  }
  const cleared = await harness.request(
    path,
    member.session,
    write({ capabilities: { preapprovedSecretIds: [] } }, 'PATCH'),
  )
  expect(cleared.status).toBe(200)
  expect(await cleared.json()).toMatchObject({
    automation: { capabilities: { preapprovedSecretIds: [] } },
  })
})

it('refuses malformed capabilities on create and update without changing the automation', async () => {
  const { org, member, input, seed } = await automationFixture(harness)
  const path = await seed()
  for (const capabilities of [
    null,
    [],
    {},
    { preapprovedSecretIds: 'secret' },
    { preapprovedSecretIds: [1] },
  ]) {
    for (const [target, method, body] of [
      [automationsPath(org.id), 'POST', { ...input, capabilities }],
      [path, 'PATCH', { capabilities, name: 'Do not save this name' }],
    ] as const) {
      const response = await harness.request(
        target,
        member.session,
        write(body, method),
      )
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({
        error: { code: 'invalid_input' },
      })
    }
  }
  const read: AutomationResponse = await (
    await harness.request(path, member.session)
  ).json()
  expect(read.automation).toMatchObject({
    name: input.name,
    capabilities: { preapprovedSecretIds: [] },
  })
})

it('removes choices when their secret or automation is deleted', async () => {
  const { org, member, create } = await automationFixture(harness)
  const db = harness.env.DB
  await automationSecret(db, org.id, member.user.id, 'deleted-secret')
  await automationSecret(db, org.id, member.user.id, 'kept-secret')
  const created = await create({
    capabilities: { preapprovedSecretIds: ['deleted-secret', 'kept-secret'] },
  })
  expect(created.capabilities).toEqual({
    preapprovedSecretIds: ['deleted-secret', 'kept-secret'],
  })
  expect(await deleteSecret(db, org.id, 'deleted-secret', member.user.id)).toBe(
    true,
  )
  const path = automationPath(org.id, created.id)
  const read: AutomationResponse = await (
    await harness.request(path, member.session)
  ).json()
  expect(read.automation.capabilities).toEqual({
    preapprovedSecretIds: ['kept-secret'],
  })
  expect(
    (await harness.request(path, member.session, write({}, 'DELETE'))).status,
  ).toBe(204)
  expect(
    await db
      .prepare('SELECT COUNT(*) AS count FROM automation_secret_preapprovals')
      .first('count'),
  ).toBe(0)
})
