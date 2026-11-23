/**
 * The requests of an account deletion, from decision 4 A of the universal
 * Expo app plan: a person requests the deletion on their Account page, and
 * an operator completes each request. The people come from the Users tab
 * of the operator section.
 */
import { userPages, type UserPage } from './operatorUserPages'

/** The request of Cal, the person signed in, on his Account page. */
export const accountRequest = {
  /** The day of the request, as General gives it after the request. */
  day: '8 November',
} as const

/**
 * The message of a request that did not reach the server, as the other
 * failed requests of the mockups give it.
 */
export const requestFailure =
  "The app can't reach the server. Check the connection, then try again."

/** A request in the Deletions tab: the person, and the day of the request. */
export type DeletionRequest = {
  login: string
  /** The name on GitHub, which some accounts do not give. */
  name?: string
  initials: string
  /** The day of the request, in the format of the Joined column. */
  day: string
}

/**
 * The requests that wait for an operator, oldest first. @vex-ops gives no
 * name on GitHub.
 */
export const deletionRequests: readonly DeletionRequest[] = [
  { login: 'li-wei', name: 'Li Wei', initials: 'LW', day: '2 Nov' },
  { login: 'vex-ops', initials: 'V', day: '5 Nov' },
  { login: 'dana-k', name: 'Dana Kim', initials: 'DK', day: '7 Nov' },
]

/**
 * The page of Dana Kim after her request, as the operator opens it from the
 * Deletions tab. The rest of the page is her page in use.
 */
export const deletionUserPages = {
  deletion: { ...userPages.active, deletionRequested: '7 Nov 2026' },
} as const satisfies Record<string, UserPage>
