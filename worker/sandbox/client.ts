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
>

/** Trusted callers authorize the org and its resource before requesting a provider. */
export function providerForAccount(
  env: ProviderAccountEnvironment,
  fetch: HttpFetch,
  accountId: string,
): SandboxProvider {
  const account = configuredAccount(env, accountId)
  switch (account.kind) {
    case 'boat':
      return new BoatClient(account.apiKey, fetch, account.orgId)
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
