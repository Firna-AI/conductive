/**
 * The requests of an account deletion, from decision 4 A of the universal
 * Expo app plan: a person requests the deletion on their Account page, and
 * an operator completes each request. Each request of the Deletions tab is
 * one record: the person, the day of the request, and the page of that
 * person. Its row, the page of the person with the request, and the link
 * between them all come from that record.
 */
import { deletionPaths } from '../deletionPaths'
import { accessPages } from './operatorAccessPages'
import type { UserPage } from './operatorUserPages'

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

/** A request that waits for an operator. */
export type DeletionRequest = {
  /** The page of the person, as the operator opens it without a request. */
  user: UserPage
  /** The day of the request, as the row and the page of the person give it. */
  day: string
  /** The page of the person with the request, which the row opens. */
  page: string
}

/**
 * The requests that wait, oldest first, by the state of the page of a user
 * that draws each person. Each person has their own page in the operator
 * section, and none of them is the only admin of an org with other
 * members: Kai Tanaka is a member of Hexwave, Noor Aziz has no org yet,
 * and Rhea Okafor is the only member of Rhino Data.
 */
const requests = {
  deletionKai: {
    user: accessPages.orgInvitation,
    day: '7 Nov',
    page: deletionPaths.requesterKai,
  },
  deletionNoor: {
    user: accessPages.openSignUpWaited,
    day: '8 Nov',
    page: deletionPaths.requesterNoor,
  },
  deletionRhea: {
    user: accessPages.inviteCode,
    day: '8 Nov',
    page: deletionPaths.requesterRhea,
  },
} as const satisfies Record<string, DeletionRequest>

/** The rows of the Deletions tab, oldest first. */
export const deletionRequests: readonly DeletionRequest[] =
  Object.values(requests)

/** The page of a person with their request, as their row opens it. */
function withRequest(request: DeletionRequest): UserPage {
  return { ...request.user, deletionRequested: request.day }
}

/** The page of each person with their request, by its state. */
export const deletionUserPages: Readonly<
  Record<keyof typeof requests, UserPage>
> = {
  deletionKai: withRequest(requests.deletionKai),
  deletionNoor: withRequest(requests.deletionNoor),
  deletionRhea: withRequest(requests.deletionRhea),
}
