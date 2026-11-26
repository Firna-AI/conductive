import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  automationPath,
  automationsPath,
  type AutomationResponse,
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
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('returns current chosen secret names in each automation reply for org members without secret values', async () => {
  const { org, member, other, input } = await automationFixture(harness)
  const db = harness.env.DB
  await automationSecret(db, org.id, member.user.id, 'a-last', 'Z_LAST')
  await automationSecret(db, org.id, member.user.id, 'z-first', 'A_FIRST')
  await automationSecret(db, org.id, member.user.id, 'not-chosen')
  const foreign = await harness.createOrg(member.session, 'Other org')
  await automationSecret(db, foreign.id, member.user.id, 'foreign-secret')
  const created = await harness.request(
    automationsPath(org.id),
    member.session,
    write({
      ...input,
      capabilities: {
        preapprovedSecretIds: [
          'a-last',
          'z-first',
          'missing',
          'foreign-secret',
          'a-last',
        ],
      },
    }),
  )
  expect(created.status).toBe(201)
  const saved: AutomationResponse = await created.json()
  expect(saved.chosenSecrets).toEqual([
    { id: 'z-first', name: 'A_FIRST' },
    { id: 'a-last', name: 'Z_LAST' },
  ])
  expect(saved.automation.capabilities).toEqual({
    preapprovedSecretIds: ['a-last', 'z-first'],
  })
  expect(JSON.stringify(saved)).not.toContain('unused-ciphertext')
  const path = automationPath(org.id, saved.automation.id)
  const read = await harness.request(path, other.session)
  expect(read.status).toBe(200)
  const detail: AutomationResponse = await read.json()
  expect(detail.chosenSecrets).toEqual([
    { id: 'z-first', name: 'A_FIRST' },
    { id: 'a-last', name: 'Z_LAST' },
  ])
  expect(JSON.stringify(detail)).not.toContain('unused-ciphertext')
  const wrongOrg = await harness.request(
    automationPath(foreign.id, saved.automation.id),
    member.session,
  )
  expect(wrongOrg.status).toBe(404)
  expect(await wrongOrg.json()).toMatchObject({
    error: { code: 'automation_not_found' },
  })
  const nonmember = await harness.request(
    automationPath(foreign.id, saved.automation.id),
    other.session,
  )
  expect(nonmember.status).toBe(404)
  expect(await nonmember.json()).toMatchObject({
    error: { code: 'org_not_found' },
  })
  expect(await deleteSecret(db, org.id, 'a-last', member.user.id)).toBe(true)
  const updated = await harness.request(
    path,
    member.session,
    write({ name: 'Keep choices from an older app' }, 'PATCH'),
  )
  expect(updated.status).toBe(200)
  const update: AutomationResponse = await updated.json()
  expect(update.chosenSecrets).toEqual([{ id: 'z-first', name: 'A_FIRST' }])
  expect(update.automation.capabilities).toEqual({
    preapprovedSecretIds: ['z-first'],
  })
  expect(JSON.stringify(update)).not.toContain('unused-ciphertext')
  await db
    .prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
    .bind(org.id)
    .run()
  const suspended = await harness.request(path, other.session)
  expect(suspended.status).toBe(200)
  expect(await suspended.json()).toMatchObject({
    chosenSecrets: [{ id: 'z-first', name: 'A_FIRST' }],
  })
  await db
    .prepare('UPDATE orgs SET suspended_at = NULL WHERE id = ?')
    .bind(org.id)
    .run()
  const cleared = await harness.request(
    path,
    member.session,
    write({ capabilities: { preapprovedSecretIds: [] } }, 'PATCH'),
  )
  expect(cleared.status).toBe(200)
  expect(await cleared.json()).toMatchObject({ chosenSecrets: [] })
})
