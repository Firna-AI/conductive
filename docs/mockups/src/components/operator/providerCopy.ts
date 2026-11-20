/**
 * The words of the Providers tab of the operator, and of the account
 * choice that only an operator sees on Create org. Operator screens name
 * each provider account by its ID, such as `boat` or `e2b`. No screen for
 * other people names an account or a provider. A login goes in without
 * `@`, and a time as the page writes it. This module imports no fixture,
 * so the app uses it too.
 */

/**
 * The words of the Providers tab: the New orgs box with the weights and
 * Save weights, and the box that counts the orgs on each account.
 */
export const providerWords = {
  tab: 'Providers',
  weights: 'New orgs',
  weightsLine:
    'Each new org gets an account by chance, from these weights. An org keeps its account for its whole life.',
  weightsLabel: 'Weights of new orgs',
  save: 'Save weights',
  notSaved: "The weights weren't saved. Try again.",
  counts: 'Orgs by account',
  notLoaded: "The provider accounts didn't load",
} as const

/** The spoken name of the weight field of one account. */
export function weightFieldLabel(account: string): string {
  return `Weight of ${account}, in percent`
}

/**
 * The line under the weight fields of three or more accounts: the total of
 * the whole numbers, and what Save weights needs. `total` is null while a
 * field holds no whole number from 0 to 100.
 */
export function weightsTotalLine(total: number | null): string {
  if (total === null) return 'Give each account a whole number from 0 to 100.'
  if (total === 100) return 'Total: 100%'
  return `Total: ${total}%. Save weights needs a total of 100%.`
}

/**
 * The line of the New orgs box when the app has one account only, in
 * place of the slider. The ID goes in backticks, so the box shows it as
 * code.
 */
export function onlyAccountLine(account: string): string {
  return `Every new org gets \`${account}\`, the only account.`
}

/**
 * The line under the weights: when, and by which operator, they last
 * changed. Weights that no operator has changed have no line.
 */
export function weightsChangedLine(
  when: string | null,
  operator: string | null,
): string | null {
  if (when === null) return null
  return operator === null
    ? `Changed on ${when}`
    : `Changed on ${when} by @${operator}`
}

/**
 * The words of the account of an org on the Orgs tab and on the page of an
 * org. A phone leaves out the column, so the line under the name says it.
 */
export const orgAccountWords = {
  term: 'Account',
  runsOn: 'Runs on',
} as const

/**
 * The words of the account choice on Create org, which only an operator
 * sees. By weights leaves the choice to the weights of the Providers tab.
 */
export const accountChoiceWords = {
  label: 'Provider account',
  weights: 'By weights',
  hint: 'Only operators see this. The org keeps its account for its whole life.',
} as const
