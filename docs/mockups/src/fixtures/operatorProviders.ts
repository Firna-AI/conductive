/**
 * The provider accounts that the Providers tab of the operator shows: the
 * weight of each account for new orgs, the orgs on it, and the last change
 * of the weights. The shapes follow the reply of the operator route of the
 * providers. Operator screens name each account by its ID.
 */
import { operatorTotals } from './operator'
import { account } from './orgs'

/**
 * The ID of a provider account, as the settings of the Worker name it.
 * `e2b-us` stands for any third account that the settings can add.
 */
export type AccountId = 'boat' | 'e2b' | 'e2b-us'

/**
 * A provider account: its ID, its weight for new orgs in whole percent,
 * and its orgs, deleted orgs included.
 */
type ProviderAccount = { id: AccountId; weight: number; orgs: number }

/** The accounts, and the last change of their weights. */
export type ProviderSettings = {
  accounts: readonly ProviderAccount[]
  /** When an operator last changed the weights, or null for the default. */
  updatedAt: string | null
  /** The login of that operator, or null. */
  operator: string | null
}

/** The orgs on e2b: Acme Labs, the test org that the operator put there. */
const e2bOrgs = 1

/** The other orgs are on boat, so the counts add up to the Overview. */
const boatOrgs = operatorTotals.orgs.total - e2bOrgs

/** The default weights: every new org gets boat. No operator changed them. */
export const defaultProviders: ProviderSettings = {
  accounts: [
    { id: 'boat', weight: 100, orgs: boatOrgs },
    { id: 'e2b', weight: 0, orgs: e2bOrgs },
  ],
  updatedAt: null,
  operator: null,
}

/** The operator moved the slider to give e2b 10%, and has not saved yet. */
export const movedProviders: ProviderSettings = {
  ...defaultProviders,
  accounts: [
    { id: 'boat', weight: 90, orgs: boatOrgs },
    { id: 'e2b', weight: 10, orgs: e2bOrgs },
  ],
}

/** The same weights after Save weights, with the time and the operator. */
export const savedProviders: ProviderSettings = {
  ...movedProviders,
  updatedAt: '8 Nov at 15:02',
  operator: account.login,
}

/**
 * The settings of the Worker have the boat account only, so it gets every
 * new org, and the slider has no second end.
 */
export const oneAccountProviders: ProviderSettings = {
  accounts: [{ id: 'boat', weight: 100, orgs: operatorTotals.orgs.total }],
  updatedAt: null,
  operator: null,
}

/** Three accounts in the ID order of the reply, with weights in whole percent. */
function threeAccounts(
  boat: number,
  e2b: number,
  e2bUs: number,
): readonly ProviderAccount[] {
  return [
    { id: 'boat', weight: boat, orgs: boatOrgs },
    { id: 'e2b', weight: e2b, orgs: e2bOrgs },
    { id: 'e2b-us', weight: e2bUs, orgs: 0 },
  ]
}

/**
 * The settings of the Worker have a third account, so one slider does not
 * fit, and each account gets its own field. Each state of the weights has
 * its own fixture: the default, saved, moved to a total of 110, and a save
 * that failed with a total of 100.
 */
export const threeAccountProviders = {
  default: { ...defaultProviders, accounts: threeAccounts(100, 0, 0) },
  saved: {
    ...savedProviders,
    accounts: threeAccounts(80, 10, 10),
  },
  moved: { ...savedProviders, accounts: threeAccounts(80, 10, 20) },
  notSaved: { ...savedProviders, accounts: threeAccounts(70, 10, 20) },
} as const satisfies Record<string, ProviderSettings>

/** The accounts that Create org offers to an operator, by their IDs. */
export const createAccounts: readonly AccountId[] =
  defaultProviders.accounts.map((item) => item.id)
