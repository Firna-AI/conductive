import { expect, it } from 'vitest'

import { FakeBoat } from '../test-support/fake-boat'
import { ProviderAccountError } from './accounts'
import { providerForAccount } from './client'
import { ProviderError } from './errors'

it('uses each account organization and key while keeping the default account pinned', async () => {
  const server = new FakeBoat()
  const secondary = {
    kind: 'boat',
    orgId: 'second-org',
    apiKey: 'boat-second',
  } as const
  server.addAccount(secondary)
  const env = {
    BOAT_API_KEY: 'boat-first',
    BOAT_ORG_ID: 'app-org',
    SANDBOX_PROVIDER_ACCOUNTS: {
      boat: secondary,
      'boat-second': secondary,
    },
  }

  await providerForAccount(env, server.fetch, 'boat').get('bx_one')
  await providerForAccount(env, server.fetch, 'boat-second').get('bx_one')

  expect(
    server.requests.map((request) => [
      request.headers.get('X-Boat-Org'),
      request.headers.get('Authorization'),
    ]),
  ).toEqual([
    ['app-org', 'Bearer boat-first'],
    ['second-org', 'Bearer boat-second'],
  ])
})

it('fails unknown accounts before a provider request with a separate typed error', () => {
  const server = new FakeBoat()
  const env = { BOAT_API_KEY: 'boat-first', BOAT_ORG_ID: 'app-org' }
  const lookup = () => providerForAccount(env, server.fetch, 'missing-account')

  expect(lookup).toThrowError(ProviderAccountError)
  expect(lookup).not.toThrowError(ProviderError)
  expect(lookup).toThrowError(
    /^The sandbox provider account is not configured\.$/,
  )
  expect(server.requests).toHaveLength(0)
})
