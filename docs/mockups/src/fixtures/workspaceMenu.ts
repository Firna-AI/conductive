/**
 * The workspace menu of a list row: Move to section, Reassign to, Rename,
 * and Archive. These are the rows and the words of its states.
 */

import type { UnpushedWork } from './archive'

/**
 * The row whose menu most states open: Apple Pay button, a ready
 * workspace of Cal in Checkout, which no screen shows open.
 */
export const menuTarget = 'apple-pay'

/** The workspace of Priya, a member who is not an admin: Archive is hers. */
export const memberTarget = 'pricing-copy'

/** The archived workspace whose menu an admin opens in the Archived group. */
export const archivedTarget = 'checkout-redesign'

/**
 * The stopped workspace whose Archive check does not finish, because its
 * stopped cloud computer refuses the command that checks the work.
 */
export const stoppedTarget = 'checkout-autocomplete'

/** The new name that the user typed in the field of the row. */
export const renameDraft = 'Apple Pay on checkout'

/** The work of Apple Pay button that is not on GitHub yet. */
export const menuTargetWork: UnpushedWork = {
  files: ['src/app/checkout/ApplePayButton.tsx'],
  commits: 2,
}

/**
 * The message of the server when a stopped cloud computer refuses the
 * check of Archive.
 */
export const checkRefused =
  'Open the workspace to check its saved work. Then try again.'

/** The message of the app when it can't reach the server. */
export const offline =
  "The app can't reach the server. Check the connection, then try again."
