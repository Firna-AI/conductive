import { afterEach, expect, it, vi } from 'vitest'

import { FakeBoat } from '../test-support/fake-boat'
import { configuredProviderAccounts, ProviderAccountError } from './accounts'
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
    SANDBOX_PROVIDER_ACCOUNTS: JSON.stringify({
      boat: secondary,
      'boat-second': secondary,
    }),
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

afterEach(() => vi.restoreAllMocks())

it('reads JSON secret accounts and retains valid entries when another entry is malformed', () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const env = {
    BOAT_API_KEY: 'pinned-key',
    BOAT_ORG_ID: 'pinned-org',
    SANDBOX_PROVIDER_ACCOUNTS: JSON.stringify({
      good: { kind: 'boat', apiKey: 'other-key', orgId: 'other-org' },
      invalid: { kind: 'boat', apiKey: 'sensitive-invalid-key' },
    }),
  }
  expect(configuredProviderAccounts(env)).toEqual({
    boat: { kind: 'boat', apiKey: 'pinned-key', orgId: 'pinned-org' },
    good: { kind: 'boat', apiKey: 'other-key', orgId: 'other-org' },
  })
  expect(warning.mock.calls).toEqual([
    [
      {
        kind: 'provider_accounts_invalid',
        message: 'Some sandbox provider accounts are not configured correctly.',
      },
    ],
  ])
})

it('recovers malformed JSON secrets with pinned Boat and a safe warning', () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const env = {
    BOAT_API_KEY: 'pinned-key',
    BOAT_ORG_ID: 'pinned-org',
    SANDBOX_PROVIDER_ACCOUNTS: '{sensitive-invalid-key',
  }
  expect(configuredProviderAccounts(env)).toEqual({
    boat: { kind: 'boat', apiKey: 'pinned-key', orgId: 'pinned-org' },
  })
  expect(warning.mock.calls).toEqual([
    [
      {
        kind: 'provider_accounts_invalid',
        message: 'Some sandbox provider accounts are not configured correctly.',
      },
    ],
  ])
})

it('reads a configured E2B account from the JSON secret beside pinned Boat', () => {
  const account = {
    kind: 'e2b',
    apiKey: 'e2b-secret',
    domain: 'eu.e2b.test',
    templateId: 'base-template',
  }
  expect(
    configuredProviderAccounts({
      BOAT_API_KEY: 'boat-key',
      BOAT_ORG_ID: 'boat-org',
      SANDBOX_PROVIDER_ACCOUNTS: JSON.stringify({ e2b: account }),
    }),
  ).toEqual({
    boat: { kind: 'boat', apiKey: 'boat-key', orgId: 'boat-org' },
    e2b: account,
  })
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
