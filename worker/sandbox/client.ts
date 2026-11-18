import { findMembership } from '../data/orgs'
import type { AppEnv, HttpFetch } from '../env'
import { HttpError } from '../http'
import { DEFAULT_PROVIDER_ACCOUNT } from './account-identity'
import {
  ProviderAccountError,
  type ProviderAccountConfiguration,
} from './accounts'
import { BoatClient } from './boat'
import type { SandboxProvider } from './provider'

type ProviderAccountEnvironment = Pick<
  AppEnv,
  'BOAT_API_KEY' | 'BOAT_ORG_ID' | 'SANDBOX_PROVIDER_ACCOUNTS'
> &
  Partial<Pick<AppEnv, 'DB'>>

type ProviderObserver = (provider: SandboxProvider) => SandboxProvider

const observers = new WeakMap<D1Database, ProviderObserver>()

/**
 * A workspace object times the provider calls of its start runs. Its env
 * holds its own timed D1 binding, so the binding marks that env, also in a
 * copy made with `{ ...env }`.
 */
export function observeProviders(
  db: D1Database,
  observer: ProviderObserver,
): void {
  observers.set(db, observer)
}

/** Trusted callers authorize the org and its resource before requesting a provider. */
export function providerForAccount(
  env: ProviderAccountEnvironment,
  fetch: HttpFetch,
  accountId: string,
): SandboxProvider {
  const account = configuredAccount(env, accountId)
  switch (account.kind) {
    case 'boat': {
      const provider = new BoatClient(account.apiKey, fetch, account.orgId)
      const observer = env.DB && observers.get(env.DB)
      return observer ? observer(provider) : provider
    }
    default: {
      const unsupported: never = account.kind
      throw new Error(
        `The sandbox provider kind is not supported: ${unsupported}`,
      )
    }
  }
}

function configuredAccount(
  env: ProviderAccountEnvironment,
  accountId: string,
): ProviderAccountConfiguration {
  if (accountId === DEFAULT_PROVIDER_ACCOUNT) {
    return { kind: 'boat', apiKey: env.BOAT_API_KEY, orgId: env.BOAT_ORG_ID }
  }
  const accounts = env.SANDBOX_PROVIDER_ACCOUNTS
  if (!accounts || !Object.hasOwn(accounts, accountId))
    throw new ProviderAccountError(accountId)
  return accounts[accountId]
}

export async function orgProviderForAccount(
  env: AppEnv,
  userId: string,
  orgId: string,
  fetch: HttpFetch,
  accountId: string,
): Promise<SandboxProvider> {
  if (!(await findMembership(env.DB, orgId, userId))) {
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  }
  return providerForAccount(env, fetch, accountId)
}
