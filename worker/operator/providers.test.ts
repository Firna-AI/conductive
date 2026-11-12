import { expect, it } from 'vitest'

import { orgPath } from '../../src/shared/api'
import { operatorOrgPath, operatorOrgsPath } from '../../src/shared/operator'
import { operatorProvidersPath } from '../../src/shared/operator-providers'
import { TEST_TIME } from '../test-support/harness'
import { seedOrg } from './overview.test-support'
import { setupProviderTests } from './providers.test-support'
import { operatorWrite } from './waitlist.test-support'

const fixtureForTest = setupProviderTests()
const path = operatorProvidersPath()

it('gates provider reads and writes with the app session and operator identity', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  expect((await harness.fetch(path)).status).toBe(401)
  for (const operators of ['8', undefined]) {
    harness.env.OPERATOR_GITHUB_IDS = operators
    for (const init of [{}, operatorWrite({ weights: { boat: 100 } }, 'PUT')]) {
      const reply = await harness.request(path, cookie, init)
      expect(reply.status).toBe(403)
      expect(await reply.json()).toEqual({
        error: {
          code: 'operator_required',
          message: 'Operator access is required.',
        },
      })
    }
  }
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) FROM provider_assignment_events',
    ).first('COUNT(*)'),
  ).toBe(0)
})

it('returns configured IDs, effective weights and counts including deleted orgs, without revealing credentials', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'boat-org' })
  await seedOrg(harness, { id: 'e2b-deleted', deletedAt: TEST_TIME })
  await harness.env.DB.prepare(
    'UPDATE orgs SET provider_account = ? WHERE id = ?',
  )
    .bind('e2b', 'e2b-deleted')
    .run()
  harness.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    spare: { kind: 'boat', apiKey: 'private-spare-key', orgId: 'private-org' },
    e2b: {
      kind: 'e2b',
      apiKey: 'private-e2b-key',
      domain: 'eu.e2b.dev',
      templateId: 'private-template',
    },
  })
  const reply = await harness.request(path, cookie)
  expect(reply.status).toBe(200)
  expect(await reply.json()).toEqual({
    accounts: [
      { id: 'boat', weight: 100, orgs: 1 },
      { id: 'e2b', weight: 0, orgs: 1 },
      { id: 'spare', weight: 0, orgs: 0 },
    ],
    updatedAt: null,
    operator: null,
  })
  expect(
    await (
      await harness.request(operatorOrgsPath({ q: 'e2b-deleted' }), cookie)
    ).json(),
  ).toMatchObject({ orgs: [{ id: 'e2b-deleted', providerAccount: 'e2b' }] })
  expect(
    await (
      await harness.request(operatorOrgPath('e2b-deleted'), cookie)
    ).json(),
  ).toMatchObject({ id: 'e2b-deleted', providerAccount: 'e2b' })
  expect(
    await (await harness.request(orgPath('boat-org'), cookie)).json(),
  ).toEqual({ org: { id: 'boat-org', name: 'boat-org', role: 'admin' } })
  delete harness.env.SANDBOX_PROVIDER_ACCOUNTS
  expect(await (await harness.request(path, cookie)).json()).toEqual({
    accounts: [{ id: 'boat', weight: 100, orgs: 1 }],
    updatedAt: null,
    operator: null,
  })
})

it('records each real weight change with its operator and time and preserves equal repeats', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  const update = (weights: unknown, session = cookie) =>
    harness.request(path, session, operatorWrite({ weights }, 'PUT'))
  expect(await (await update({ boat: 100 })).json()).toMatchObject({
    updatedAt: null,
    operator: null,
  })
  harness.setTime(TEST_TIME + 10)
  const first = await update({ e2b: 75, boat: 25 })
  expect(first.status).toBe(200)
  const saved = {
    accounts: [
      { id: 'boat', weight: 25, orgs: 0 },
      { id: 'e2b', weight: 75, orgs: 0 },
    ],
    updatedAt: TEST_TIME + 10,
    operator: { githubId: 7, login: 'octocat' },
  }
  expect(await first.json()).toEqual(saved)
  harness.github.profile = { id: 8, login: 'other-operator' }
  const other = await harness.login()
  harness.env.OPERATOR_GITHUB_IDS = '7,8'
  harness.setTime(TEST_TIME + 20)
  expect(await (await update({ boat: 25, e2b: 75 }, other)).json()).toEqual(
    saved,
  )
  expect(await (await harness.request(path, cookie)).json()).toEqual(saved)
  harness.setTime(TEST_TIME + 30)
  expect(await (await update({ e2b: 100 }, other)).json()).toMatchObject({
    updatedAt: TEST_TIME + 30,
    operator: { githubId: 8, login: 'other-operator' },
  })
  expect(
    (
      await harness.env.DB.prepare(
        `SELECT e.weights_json AS weights, e.changed_at AS at, u.github_id AS actor
    FROM provider_assignment_events e LEFT JOIN users u ON u.id = e.operator_user_id ORDER BY e.id`,
      ).all()
    ).results,
  ).toEqual([
    { weights: '{"boat":25,"e2b":75}', at: TEST_TIME + 10, actor: 7 },
    { weights: '{"boat":0,"e2b":100}', at: TEST_TIME + 30, actor: 8 },
  ])
})

it('refuses only invalid percentage distributions and unknown configured IDs before writing', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  for (const weights of [
    { boat: 99 },
    { boat: 100, missing: 0 },
    { boat: -1, e2b: 101 },
    { boat: 0.5, e2b: 99.5 },
    { boat: '100' },
    [],
    null,
  ]) {
    const reply = await harness.request(
      path,
      cookie,
      operatorWrite({ weights }, 'PUT'),
    )
    expect(reply.status, JSON.stringify(weights)).toBe(400)
    expect(await reply.json()).toEqual({
      error: {
        code: 'invalid_input',
        message:
          'Choose whole percentages for configured accounts that add up to 100.',
      },
    })
  }
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) FROM provider_assignment_events',
    ).first('COUNT(*)'),
  ).toBe(0)
  expect(
    await harness.env.DB.prepare(
      'SELECT weights_json FROM provider_assignment_settings WHERE id = 1',
    ).first('weights_json'),
  ).toBe('{"boat":100}')
})
