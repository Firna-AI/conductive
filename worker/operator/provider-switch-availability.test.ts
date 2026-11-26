import { expect, it } from 'vitest'

import { operatorOrgSwitchPath } from '../../src/shared/operator-switch'
import { orgPage } from './directory.test-support'
import { seedOrg } from './overview.test-support'
import { setupProviderTests } from './providers.test-support'
import { operatorWrite } from './waitlist.test-support'

const fixtureForTest = setupProviderTests()

it('hides switch creation like a missing route until activation and keeps Stop available', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'org' })
  const path = operatorOrgSwitchPath('org')
  for (const value of ['off', undefined, 'ON']) {
    harness.env.PROVIDER_SWITCH = value
    const missing = await harness.request(
      '/api/operator/missing',
      cookie,
      operatorWrite({}),
    )
    const reply = await harness.request(
      path,
      cookie,
      operatorWrite({ providerAccount: 'e2b' }),
    )
    expect(reply.status).toBe(404)
    expect(await reply.json()).toEqual(await missing.json())
    expect((await orgPage(harness, cookie, 'org')).switchAvailable).toBe(false)
  }
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) FROM org_provider_switches',
    ).first('COUNT(*)'),
  ).toBe(0)
  const stopped = await harness.request(
    path,
    cookie,
    operatorWrite({}, 'DELETE'),
  )
  expect(stopped.status).toBe(200)
  expect(await stopped.json()).toEqual({ switch: null })
  harness.env.PROVIDER_SWITCH = 'on'
  expect((await orgPage(harness, cookie, 'org')).switchAvailable).toBe(true)
})
