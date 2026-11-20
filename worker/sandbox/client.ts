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

/** Trusted callers authorize the org and its resource before requesting a provider. */
export function providerForAccount(
  env: ProviderAccountEnvironment &
    Partial<Pick<AppEnv, 'DB' | 'BOAT_KEY_ENCRYPTION_KEY'>>,
  fetch: HttpFetch,
  accountId: string,
  allocationMode: ProviderAllocationMode = 'active',
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
