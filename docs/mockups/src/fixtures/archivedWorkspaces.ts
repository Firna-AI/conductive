import { workspace, type Workspace } from './workspaces'

/**
 * A workspace of Acme that a member archived 3 weeks ago. Its 14 days
 * ended, so it left the list: no section and no Archived group holds it.
 * The app keeps its chat, so a chip still finds it, with the archived
 * state, and opens its read-only chat. A member gave it a long name.
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
 * The archived workspaces of Acme in the list, the last archived first.
 * Each was archived less than 14 days ago, and the app keeps its cloud
 * computer, so Restore brings it back. Their chats stay read-only. The list
 * keeps them in its Archived group, which stays closed until the user opens
 * it, and a chip still finds each of them, with the archived state.
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
]
