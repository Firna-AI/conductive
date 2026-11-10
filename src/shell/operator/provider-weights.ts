import type { OperatorProvidersResponse } from '../../shared/operator-providers'

/** A configured account of the reply: its ID, its weight, and its orgs. */
export type ProviderAccount = OperatorProvidersResponse['accounts'][number]

/**
 * The weights that the operator changed and has not saved, as the text of
 * each field by account ID. An account without an entry keeps its saved
 * weight. The slider writes both of its accounts.
 */
export type WeightDraft = Readonly<Record<string, string>>

/** The whole percent from 0 to 100 that a field holds, or null. */
export function weightOf(text: string): number | null {
  const value = text.trim()
  if (!/^\d{1,3}$/.test(value)) return null
  const weight = Number(value)
  return weight <= 100 ? weight : null
}

/** The text of the weight of each account: the draft, or the saved weight. */
export function weightTexts(
  accounts: readonly ProviderAccount[],
  draft: WeightDraft,
): readonly { id: string; text: string }[] {
  return accounts.map((account) => ({
    id: account.id,
    text: Object.hasOwn(draft, account.id)
      ? draft[account.id]
      : String(account.weight),
  }))
}

/**
 * The weights to save: a whole percent for every account, or null while a
 * field holds no whole number from 0 to 100.
 */
export function weightsOf(
  accounts: readonly ProviderAccount[],
  draft: WeightDraft,
): Readonly<Record<string, number>> | null {
  const weights: Record<string, number> = {}
  for (const { id, text } of weightTexts(accounts, draft)) {
    const weight = weightOf(text)
    if (weight === null) return null
    weights[id] = weight
  }
  return weights
}

/** The total of the weights, or null while a field holds no whole number. */
export function totalOf(weights: Readonly<Record<string, number>> | null) {
  if (weights === null) return null
  return Object.values(weights).reduce((sum, weight) => sum + weight, 0)
}

/** Whether the draft differs from the saved weight of any account. */
export function isChanged(
  accounts: readonly ProviderAccount[],
  draft: WeightDraft,
): boolean {
  return weightTexts(accounts, draft).some(
    ({ id, text }, index) =>
      accounts[index]?.id !== id || weightOf(text) !== accounts[index].weight,
  )
}
