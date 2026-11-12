import {
  operatorProvidersPath,
  type OperatorProvidersResponse,
} from '../../shared/operator-providers'
import type { DevBackend } from './backend'
import { operatorOrgDetails } from './operator-orgs'
import type { DevOptions } from './options'
import { json, RouteError, type Route } from './router'
import type { DevProviders } from './state'

/** The configured account IDs of each preset, in ID order. */
const PRESET_ACCOUNTS: Readonly<
  Record<DevOptions['providers'], readonly string[]>
> = {
  two: ['boat', 'e2b'],
  one: ['boat'],
  three: ['boat', 'e2b', 'e2b-us'],
  fail: ['boat', 'e2b'],
}

/** The provider accounts of the options, with every new org on `boat`. */
export function seedProviders(options: DevOptions): DevProviders {
  const accounts = PRESET_ACCOUNTS[options.providers]
  return {
    accounts,
    weights: Object.fromEntries(
      accounts.map((id) => [id, id === 'boat' ? 100 : 0]),
    ),
    updatedAt: null,
    operator: null,
    readFails: options.providers === 'fail',
    saveFails: options.providerSaveFails,
    made: new Map(),
  }
}

/**
 * The account of a new org, as the Worker gives it: the choice of an
 * operator when it names a configured account, and otherwise a draw from
 * the weights.
 */
export function newOrgAccount(
  providers: DevProviders,
  choice: string | null,
  operator: boolean,
): string {
  if (operator && choice !== null && providers.accounts.includes(choice)) {
    return choice
  }
  let point = Math.random() * 100
  for (const id of providers.accounts) {
    point -= providers.weights[id] ?? 0
    if (point < 0) return id
  }
  return providers.accounts[0] ?? 'boat'
}

const invalid = () =>
  new RouteError(
    400,
    'invalid_input',
    'Choose whole percentages for configured accounts that add up to 100.',
  )

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The weights of a save, as the Worker reads them: a whole percent from 0
 * to 100 for configured accounts only, with 0 for an account that the
 * request leaves out, and a total of 100.
 */
function weightsOf(body: unknown, accounts: readonly string[]) {
  const given = isObject(body) ? body.weights : undefined
  if (!isObject(given)) throw invalid()
  if (Object.keys(given).some((id) => !accounts.includes(id))) throw invalid()
  const weights = accounts.map((id): [string, number] => {
    const weight = Object.hasOwn(given, id) ? given[id] : 0
    if (typeof weight !== 'number' || !Number.isInteger(weight)) throw invalid()
    if (weight < 0 || weight > 100) throw invalid()
    return [id, weight]
  })
  if (weights.reduce((sum, [, weight]) => sum + weight, 0) !== 100)
    throw invalid()
  return Object.fromEntries(weights)
}

/**
 * The Providers tab of the dev fake: the configured accounts, their weights,
 * and their orgs, among them the orgs that Create org made in the page. A
 * save that changes the weights records the operator and the time, and a
 * save of the same weights keeps the record, as the Worker does.
 */
export function providerRoutes(
  backend: DevBackend,
  guard: () => void,
  operator: () => { githubId: number; login: string },
): Route[] {
  const { state } = backend
  const reply = (): OperatorProvidersResponse => {
    const { accounts, weights, updatedAt } = state.providers
    const orgs = operatorOrgDetails(backend)
    return {
      accounts: accounts.map((id) => ({
        id,
        weight: weights[id] ?? 0,
        orgs: orgs.filter((org) => org.providerAccount === id).length,
      })),
      updatedAt,
      operator: state.providers.operator,
    }
  }
  return [
    {
      method: 'GET',
      path: operatorProvidersPath(),
      answer: () => {
        guard()
        if (state.providers.readFails)
          throw new RouteError(500, 'server_error', 'The request failed.')
        return json(reply())
      },
    },
    {
      method: 'PUT',
      path: operatorProvidersPath(),
      answer: ({ body }) => {
        guard()
        const providers = state.providers
        if (providers.saveFails)
          throw new RouteError(500, 'server_error', 'The request failed.')
        const weights = weightsOf(body, providers.accounts)
        const same = providers.accounts.every(
          (id) => providers.weights[id] === weights[id],
        )
        if (!same) {
          state.providers = {
            ...providers,
            weights,
            updatedAt: backend.now(),
            operator: operator(),
          }
        }
        return json(reply())
      },
    },
  ]
}
