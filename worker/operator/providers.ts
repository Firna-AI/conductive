import type {
  OperatorProvidersResponse,
  UpdateOperatorProvidersRequest,
} from '../../src/shared/operator-providers'
import type { AppEnv } from '../env'
import { HttpError, isRecord } from '../http'
import {
  changeProviderAssignmentSetting,
  readProviderAssignmentSetting,
} from '../provider-assignment/data'
import { storedProviderWeights } from '../provider-assignment/weights'
import { configuredProviderAccounts } from '../sandbox/accounts'
import { operatorProviderData } from './providers-data'

export async function readOperatorProviders(
  env: AppEnv,
): Promise<OperatorProvidersResponse> {
  const accountIds = Object.keys(configuredProviderAccounts(env)).sort()
  const { setting, orgs } = await operatorProviderData(env.DB)
  const weights = storedProviderWeights(accountIds, setting.weightsJson)
  return {
    accounts: accountIds.map((id) => ({
      id,
      weight: weights[id],
      orgs: orgs.get(id) ?? 0,
    })),
    updatedAt: setting.updatedAt,
    operator:
      setting.githubId === null || setting.login === null
        ? null
        : { githubId: setting.githubId, login: setting.login },
  }
}

function parseProviderWeights(
  body: Record<string, unknown> | null,
  accountIds: readonly string[],
): UpdateOperatorProvidersRequest['weights'] {
  const value = body?.weights
  const invalid = () =>
    new HttpError(
      400,
      'invalid_input',
      'Choose whole percentages for configured accounts that add up to 100.',
    )
  if (!isRecord(value)) throw invalid()
  if (Object.keys(value).some((id) => !accountIds.includes(id))) throw invalid()
  const entries = accountIds.map((id): [string, number] => {
    const weight = Object.hasOwn(value, id) ? value[id] : 0
    if (
      typeof weight !== 'number' ||
      !Number.isInteger(weight) ||
      weight < 0 ||
      weight > 100
    )
      throw invalid()
    return [id, weight]
  })
  if (entries.reduce((sum, [, weight]) => sum + weight, 0) !== 100)
    throw invalid()
  return Object.fromEntries(entries)
}

export async function updateOperatorProviders(
  env: AppEnv,
  body: Record<string, unknown> | null,
  operatorId: string,
  now: () => number,
): Promise<OperatorProvidersResponse> {
  const accountIds = Object.keys(configuredProviderAccounts(env)).sort()
  const weights = parseProviderWeights(body, accountIds)
  const weightsJson = JSON.stringify(weights)
  for (;;) {
    const before = await readProviderAssignmentSetting(env.DB)
    if (
      JSON.stringify(storedProviderWeights(accountIds, before.weightsJson)) ===
      weightsJson
    )
      return readOperatorProviders(env)
    if (
      await changeProviderAssignmentSetting(
        env.DB,
        before.weightsJson,
        weightsJson,
        operatorId,
        now(),
      )
    )
      return readOperatorProviders(env)
  }
}
