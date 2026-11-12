import { codex, workspace, type Workspace } from './workspaces'

/**
 * A workspace of Acme that a member archived weeks ago. The app keeps it in
 * the Archived group of the list, and a chip still finds it, with the
 * archived state. A member gave it a long name.
 */
export const postcodeLookup = workspace(
  'postcode-lookup',
  'Postcode lookup for the shipping and billing forms',
  {
    number: 372,
    id: 'sWqf3Lm9jj41zKQ1-L5UDzz4AkseW78wSU1wWONFZlA',
    repository: 'storefront',
    section: 'checkout',
    status: 'archived',
    github: null,
    updated: '3w',
  },
)

/**
 * The archived workspaces of Acme, the last archived first. Their chats
 * stay read-only. The list keeps them in its Archived group, which stays
 * closed until the user opens it, and a chip still finds each of them,
 * with the archived state.
 */
export const archivedWorkspaceList: readonly Workspace[] = [
  workspace('checkout-redesign', 'Checkout page redesign', {
    number: 393,
    id: 'GbhsY00abGIO98jK0pNrwEQjp37UEPRczOKeesCBTLE',
    repository: 'storefront',
    section: 'checkout',
    status: 'archived',
    github: 'merged',
    updated: '4d',
  }),
  workspace('black-friday-banner', 'Black Friday banner', {
    number: 386,
    id: 'DHxa_rrhck8nXgdK-Zt7khg4Z4t7YWrSQ1MKRaEWf1U',
    repository: 'storefront',
    section: 'general',
    status: 'archived',
    github: 'merged',
    updated: '9d',
    owner: 'priya',
  }),
  workspace(
    'stripe-sdk',
    'Stripe SDK upgrade',
    {
      number: 381,
      id: 'uiKwnn39JBDqjqP6QZYJKHN-GY0x_FegD8AgNtcySvo',
      repository: 'billing-service',
      section: 'infra',
      status: 'archived',
      github: 'checks-failed',
      updated: '16d',
      owner: 'jonas',
    },
    codex,
  ),
  postcodeLookup,
]

/**
 * The archived workspaces whose cloud computers the app still keeps: each
 * was archived less than 14 days ago, so Restore brings it back. The app
 * deleted the cloud computers of the older ones.
 */
export const keptArchives: ReadonlySet<string> = new Set([
  'checkout-redesign',
  'black-friday-banner',
])
