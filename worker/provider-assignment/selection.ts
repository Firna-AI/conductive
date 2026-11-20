import type { AppEnv } from '../env'
import { configuredProviderAccounts } from '../sandbox/accounts'
import { hash } from '../security/crypto'
import { warnWorker } from '../warnings'
import { readProviderAssignmentSetting } from './data'
import { storedProviderWeights } from './weights'

export async function readEffectiveProviderWeights(
  env: AppEnv,
): Promise<Readonly<Record<string, number>>> {
  const accounts = configuredProviderAccounts(env)
  return readWeights(env.DB, Object.keys(accounts).sort())
}

async function readWeights(
  db: D1Database,
  accountIds: readonly string[],
): Promise<Readonly<Record<string, number>>> {
  const setting = await readProviderAssignmentSetting(db)
  return storedProviderWeights(accountIds, setting.weightsJson)
}

export async function selectOrgProviderAccount(
  env: AppEnv,
  operator: boolean,
  requested: unknown,
  randomToken: () => string,
): Promise<string> {
  const accounts = configuredProviderAccounts(env)
  if (operator && requested !== undefined) {
    if (typeof requested === 'string' && Object.hasOwn(accounts, requested))
      return requested
    warnWorker({ kind: 'provider_assignment_choice_ignored' })
  }
  const weights = await readWeights(env.DB, Object.keys(accounts).sort())
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  const digest = await hash(randomToken())
  let fraction = 0
  for (const character of digest.slice(0, 8))
    fraction = fraction * 64 + alphabet.indexOf(character)
  const draw = (fraction / 2 ** 48) * 100
  let cumulative = 0
  for (const id of Object.keys(weights).sort()) {
    const weight = weights[id]
    cumulative += weight
    if (draw < cumulative) return id
  }
  throw new Error('The effective provider weights have no account')
}
