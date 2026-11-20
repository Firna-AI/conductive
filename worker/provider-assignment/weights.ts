import { isRecord } from '../http'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { warnWorker } from '../warnings'

export function storedProviderWeights(
  accountIds: readonly string[],
  weightsJson: string,
): Readonly<Record<string, number>> {
  let value: unknown = null
  try {
    value = JSON.parse(weightsJson)
  } catch {
    // Keep the raw record while the effective distribution recovers.
  }
  return effectiveProviderWeights(accountIds, value)
}

function effectiveProviderWeights(
  accountIds: readonly string[],
  value: unknown,
): Readonly<Record<string, number>> {
  const supplied = isRecord(value) ? value : {}
  let recovered = !isRecord(value)
  const entries = accountIds.map((id) => {
    const weight = Object.hasOwn(supplied, id) ? supplied[id] : 0
    const valid =
      typeof weight === 'number' && Number.isSafeInteger(weight) && weight >= 0
    if (!valid) recovered = true
    return { id, weight: valid ? weight : 0 }
  })
  if (Object.keys(supplied).some((id) => !accountIds.includes(id)))
    recovered = true
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  if (total !== 100) recovered = true
  if (recovered) warnWorker({ kind: 'provider_assignment_weights_recovered' })
  if (!Number.isSafeInteger(total) || total <= 0)
    return Object.fromEntries(
      accountIds.map((id) => [id, id === DEFAULT_PROVIDER_ACCOUNT ? 100 : 0]),
    )
  const shares = entries.map(({ id, weight }) => {
    const exact = (weight / total) * 100
    return { id, weight: Math.floor(exact), remainder: exact % 1 }
  })
  const missing = 100 - shares.reduce((sum, entry) => sum + entry.weight, 0)
  const ranked = [...shares].sort(
    (a, b) =>
      b.remainder - a.remainder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
  for (const share of ranked.slice(0, missing)) share.weight++
  return Object.fromEntries(shares.map(({ id, weight }) => [id, weight]))
}
