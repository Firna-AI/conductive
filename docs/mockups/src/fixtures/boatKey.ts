import type { PersonKey } from './members'

/**
 * The pages of Boat that the Boat key screen and Get started link to, as
 * decision 47 allows: the sign-up, and the dashboard where an admin makes
 * an API key.
 */
export const boatPages = {
  signUp: 'https://boat.dev',
  dashboard: 'https://boat.dev/dashboard',
} as const

/**
 * The custom actions that the Boat key needs. Boat's `ci` preset deletes
 * only the sandboxes that its own key created, so the key screen asks for
 * these actions in its place.
 */
export const boatKeyActions = [
  'account.read',
  'sandbox.create',
  'sandbox.read',
  'sandbox.update',
  'sandbox.stop',
  'sandbox.resume',
  'sandbox.fork',
  'sandbox.delete',
  'exec',
  'snapshot.read',
  'snapshot.write',
  'file.read',
  'host',
  'desktop',
] as const

/** The action that the failed test finds missing from a key. */
export const missingAction = 'sandbox.resume'

/**
 * A saved Boat key, as the app shows it: only its last four characters,
 * because the key never goes back to the browser (decision 44).
 */
export type SavedBoatKey = {
  tail: string
  /** The one Boat environment that the key is limited to. */
  environment: string
  added: string
  addedBy: PersonKey
}

/** The key of Acme, which runs every cloud computer of the org. */
export const acmeKey: SavedBoatKey = {
  tail: '7Qx2',
  environment: 'acme',
  added: '2 October 2026',
  addedBy: 'cal',
}

/** The key that Get started saves for Firna, the first org. */
export const firnaKey: SavedBoatKey = {
  tail: '9fKd',
  environment: 'firna',
  added: '6 November 2026',
  addedBy: 'cal',
}

/** A key in the field before Save and test. The field shows only dots. */
export const pastedKey = 'boat_sk_4Hc8Xw2LqP9zTm5R'
