import { isRecord } from '../http'
import { warnWorker } from '../warnings'
import { validDomain } from './e2b/identity'

export type ProviderAccountConfiguration =
  | { readonly kind: 'boat'; readonly apiKey: string; readonly orgId: string }
  | {
      readonly kind: 'e2b'
      readonly apiKey: string
      readonly domain: string
      readonly templateId: string
    }

export type ProviderAccountConfigurations = Readonly<
  Record<string, ProviderAccountConfiguration>
>

export interface ProviderAccountEnvironment {
  BOAT_API_KEY: string
  BOAT_ORG_ID: string
  SANDBOX_PROVIDER_ACCOUNTS?: string
}

export function configuredProviderAccounts(
  env: ProviderAccountEnvironment,
): ProviderAccountConfigurations {
  let supplied: unknown = {}
  let invalid = false
  if (env.SANDBOX_PROVIDER_ACCOUNTS) {
    try {
      supplied = JSON.parse(env.SANDBOX_PROVIDER_ACCOUNTS)
    } catch {
      invalid = true
    }
  }
  const entries: [string, ProviderAccountConfiguration][] = []
  if (!isRecord(supplied)) invalid = true
  else
    for (const [id, value] of Object.entries(supplied)) {
      const account = readAccount(value)
      if (account) entries.push([id, account])
      else invalid = true
    }
  if (invalid) warnWorker({ kind: 'provider_accounts_invalid' })
  return {
    ...Object.fromEntries(entries),
    boat: { kind: 'boat', apiKey: env.BOAT_API_KEY, orgId: env.BOAT_ORG_ID },
  }
}

function readAccount(value: unknown): ProviderAccountConfiguration | null {
  if (!isRecord(value) || typeof value.apiKey !== 'string' || !value.apiKey)
    return null
  if (value.kind === 'boat' && typeof value.orgId === 'string' && value.orgId)
    return { kind: 'boat', apiKey: value.apiKey, orgId: value.orgId }
  if (
    value.kind === 'e2b' &&
    typeof value.domain === 'string' &&
    validDomain(value.domain) &&
    typeof value.templateId === 'string' &&
    value.templateId
  )
    return {
      kind: 'e2b',
      apiKey: value.apiKey,
      domain: value.domain,
      templateId: value.templateId,
    }
  return null
}

export function configuredProviderAccount(
  env: ProviderAccountEnvironment,
  accountId: string,
): ProviderAccountConfiguration {
  const accounts = configuredProviderAccounts(env)
  if (!Object.hasOwn(accounts, accountId))
    throw new ProviderAccountError(accountId)
  return accounts[accountId]
}

export class ProviderAccountError extends Error {
  readonly accountId: string

  constructor(accountId: string) {
    super('The sandbox provider account is not configured.')
    this.accountId = accountId
  }
}
