import { expect, it } from 'vitest'

import { operatorOrgSwitchPath } from '../../src/shared/operator-switch'
import { TEST_ORIGIN } from '../test-support/harness'
import { seedOrg } from './overview.test-support'
import { setupProviderTests } from './providers.test-support'
import { operatorWrite } from './waitlist.test-support'

const fixtureForTest = setupProviderTests()

it('applies the existing session, app access, and operator checks to both switch routes', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'org' })
  const path = operatorOrgSwitchPath('org')
  for (const method of ['POST', 'DELETE']) {
    expect(
      (
        await harness.fetch(path, {
          ...operatorWrite({}, method),
          headers: { Origin: TEST_ORIGIN, 'Content-Type': 'application/json' },
        })
      ).status,
    ).toBe(401)
    for (const operators of ['8', undefined]) {
      harness.env.OPERATOR_GITHUB_IDS = operators
      const reply = await harness.request(
        path,
        cookie,
        operatorWrite({}, method),
      )
      expect(reply.status).toBe(403)
      expect(await reply.json()).toEqual({
        error: {
          code: 'operator_required',
          message: 'Operator access is required.',
        },
      })
    }
  }
  harness.github.profile = { id: 9, login: 'waiting' }
  const waiting = await harness.login({ appAccess: false })
  harness.env.OPERATOR_GITHUB_IDS = '7'
  for (const method of ['POST', 'DELETE']) {
    const reply = await harness.request(
      path,
      waiting,
      operatorWrite({}, method),
    )
    expect(reply.status).toBe(403)
    expect(await reply.json()).toMatchObject({
      error: { code: 'access_required' },
    })
  }
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) FROM org_provider_switches',
    ).first('COUNT(*)'),
  ).toBe(0)
})

it('returns the existing org not-found answer for unknown and malformed org IDs', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  for (const path of [
    operatorOrgSwitchPath('unknown/org'),
    '/api/operator/orgs/%ZZ/provider-switch',
  ])
    for (const method of ['POST', 'DELETE']) {
      const reply = await harness.request(
        path,
        cookie,
        operatorWrite({ providerAccount: 'e2b' }, method),
      )
      expect(reply.status).toBe(404)
      expect(await reply.json()).toEqual({
        error: { code: 'org_not_found', message: 'The org is not available.' },
      })
    }
})
