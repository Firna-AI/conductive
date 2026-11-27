import { codex, workspace, type Workspace } from './workspaces'

/**
 * The sub-workspaces of Acme, which only the pages of sub-workspaces show.
 * An agent made each of them with a create call that named a parent, so
 * each has the owner and the section of the workspace that called. The
 * other pages keep the list of Acme without them.
 */

/**
 * The work of the agent of Checkout address autocomplete, the deepest tree:
 * the search API and the list of suggestions under it, then the client of
 * the places provider under the API, and the rate limits under the client,
 * at depth 3, the deepest level.
 */
const addressSearchApi = workspace('address-search-api', 'Address search API', {
  number: 403,
  id: 'p4urIwZaBtQl-P9v9LAnPrv-XJf-LBtl57g3BcL_jLU',
  repository: 'storefront',
  section: 'checkout',
  status: 'working',
  github: 'checks-running',
  updated: 'now',
})

/** The middle row of the deepest tree, whose pull request is merged. */
export const placesClient = workspace('places-client', 'Places API client', {
  number: 404,
  id: '2knIxkMNvcEoDpgF-e4yAz2RjWxX0yQCptLoVJnc6Nw',
  repository: 'storefront',
  section: 'checkout',
  status: 'ready',
  github: 'merged',
  updated: '30m',
})

/**
 * The agent of Rate limits could not nest the load test, because Rate
 * limits is at the deepest level. So it made a sibling: it passed its own
 * parent, Places API client, and started the name with "Rate limits: ".
 * Its creator is Rate limits, and its parent is Places API client.
 */
const rateLimitLoadTest = workspace(
  'rate-limit-load-test',
  'Rate limits: Load test',
  {
    number: 407,
    id: '4FtiW_F9A9eOUaB72niSNGD0eeUFq_c5FQRtkqFpavg',
    repository: 'storefront',
    section: 'checkout',
    status: 'starting',
    messageWaiting: true,
    github: null,
    updated: 'now',
  },
)

/** The sub-workspaces of Acme, in the order of their creation. */
export const subWorkspaceList: readonly Workspace[] = [
  addressSearchApi,
  placesClient,
  workspace('suggestion-list', 'Suggestion list', {
    number: 405,
    id: '65ZUlZPjCyTpCODnP7zKkqWkd1u2PP5TbVBDFb4YqEc',
    repository: 'storefront',
    section: 'checkout',
    status: 'ready',
    github: 'checks-failed',
    updated: '18m',
  }),
  workspace('rate-limits', 'Rate limits', {
    number: 406,
    id: 'vrxjPZ-dZJpgIizg1se8cHdxwPdTZi2c2xJTCdCAyDI',
    repository: 'storefront',
    section: 'checkout',
    status: 'unread',
    github: 'draft',
    updated: '6m',
  }),
  rateLimitLoadTest,
  workspace(
    'merchant-validation',
    'Merchant validation',
    {
      number: 408,
      id: 'mdh9m5Rum4toDkcvYrpuiARMvoHJWXpZa6-GJWMist0',
      repository: 'billing-service',
      section: 'checkout',
      status: 'ready',
      github: 'ready-to-merge',
      updated: '9m',
    },
    codex,
  ),
  workspace('wallet-button-tests', 'Wallet button tests', {
    number: 409,
    id: 'J2DR8rAEB00h3U01_r5YGMfX8pmGOfVX38ttS7OtGec',
    repository: 'storefront',
    section: 'checkout',
    status: 'working',
    github: null,
    updated: 'now',
  }),
]

/**
 * The parent of each sub-workspace, by key: the workspace that its create
 * call named. The link never changes after the create. Two trees grow in
 * Checkout, under Checkout address autocomplete and under Apple Pay button.
 */
export const parentOf: ReadonlyMap<string, string> = new Map([
  ['address-search-api', 'checkout-autocomplete'],
  ['places-client', 'address-search-api'],
  ['suggestion-list', 'checkout-autocomplete'],
  ['rate-limits', 'places-client'],
  ['rate-limit-load-test', 'places-client'],
  ['merchant-validation', 'apple-pay'],
  ['wallet-button-tests', 'apple-pay'],
])
