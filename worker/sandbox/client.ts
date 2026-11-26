import { findMembership } from '../data/orgs'
import type { AppEnv, HttpFetch } from '../env'
import { HttpError } from '../http'
import {
  configuredProviderAccount,
  ProviderAccountError,
  type ProviderAccountEnvironment,
} from './accounts'
import { BoatClient } from './boat'
import { E2bClient } from './e2b/client'
import type { ProviderAllocationMode, SandboxProvider } from './provider'

type ProviderEnvironment = ProviderAccountEnvironment &
  Partial<Pick<AppEnv, 'DB' | 'BOAT_KEY_ENCRYPTION_KEY'>>

interface ProviderObserver {
  /** The binding that the observed env replaces. A provider uses it untimed. */
  plain: D1Database
  observe(provider: SandboxProvider): SandboxProvider
}

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
  env: ProviderEnvironment,
  fetch: HttpFetch,
  accountId: string,
  allocationMode: ProviderAllocationMode = 'active',
): SandboxProvider {
  const observer = env.DB && observers.get(env.DB)
  if (!observer) return createProvider(env, fetch, accountId, allocationMode)
  // A live view, not a copy: a workspace object env can gain keys later.
  const plain = new Proxy(env, {
    get: (target, key) =>
      key === 'DB' ? observer.plain : Reflect.get(target, key),
  })
  return observer.observe(
    createProvider(plain, fetch, accountId, allocationMode),
  )
}

function createProvider(
  env: ProviderEnvironment,
  fetch: HttpFetch,
  accountId: string,
  allocationMode: ProviderAllocationMode,
): SandboxProvider {
  const account = configuredProviderAccount(env, accountId)
  switch (account.kind) {
    case 'boat':
      return new BoatClient(account.apiKey, fetch, account.orgId)
    case 'e2b':
      if (!env.DB || !env.BOAT_KEY_ENCRYPTION_KEY)
        throw new ProviderAccountError(accountId)
      return new E2bClient({
        ...account,
        accountId,
        db: env.DB,
        encryptionKey: env.BOAT_KEY_ENCRYPTION_KEY,
        fetch,
        allocationMode,
      })
    default:
      return unsupportedAccount(account, accountId)
  }
}

function unsupportedAccount(_account: never, accountId: string): never {
  throw new ProviderAccountError(accountId)
}

export async function orgProviderForAccount(
  env: AppEnv,
  userId: string,
  orgId: string,
  fetch: HttpFetch,
  accountId: string,
  allocationMode: ProviderAllocationMode = 'active',
): Promise<SandboxProvider> {
  if (!(await findMembership(env.DB, orgId, userId))) {
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  }
  return providerForAccount(env, fetch, accountId, allocationMode)
}
