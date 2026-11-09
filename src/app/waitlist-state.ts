import type { codeFailures } from '../../docs/mockups/src/screens/waitlistCopy'
import type { PendingOrgInvite } from '../shared/members'
import type { ApiError } from './api/client'
import type { Loadable } from './store'

/** Why a code let nobody in, as the waitlist screen names it. */
export type CodeFailure = (typeof codeFailures)[number]

/** Where a code came from: the field of the waitlist screen, or a join link. */
export type CodeSource = 'field' | 'link'

/** The last use of a code, which the screen shows until the next use. */
export type CodeUse =
  | { state: 'none' }
  | { state: 'using'; from: CodeSource }
  /** The code let nobody in, for a reason that the screen names. */
  | { state: 'refused'; from: CodeSource; reason: CodeFailure }
  /** The use failed for another reason, such as a lost connection. */
  | { state: 'failed'; from: CodeSource; error: ApiError }

/** What the waitlist screen of a person without app access shows. */
export interface Waitlist {
  /** The primary verified email that gets the approval email, or `null`. */
  approvalEmail: string | null
  /** The org invitations of the person, or `null` until the screen shows. */
  invitations: Loadable<readonly PendingOrgInvite[]> | null
  code: CodeUse
  /** The invitation whose Accept runs, until its org opens. */
  accepting: string | null
  /** The last Accept that failed for a reason other than the pause. */
  acceptFailure: { invite: PendingOrgInvite; error: ApiError } | null
  /** The pause of sign-ups stopped the last Accept. The invitation stays. */
  acceptPaused: boolean
}

/** Changes the address of the window, while the screen still shows. */
export type Opener = (to: string) => void

/** The screen before its first read. */
export const initialWaitlist: Waitlist = {
  approvalEmail: null,
  invitations: null,
  code: { state: 'none' },
  accepting: null,
  acceptFailure: null,
  acceptPaused: false,
}

/** The reason of a refused code, from its error code, or `null` for another error. */
export function failureOf(code: string): CodeFailure | null {
  switch (code) {
    case 'invite_code_not_found':
      return 'unknown'
    case 'invite_code_disabled':
      return 'disabled'
    case 'invite_code_used_up':
      return 'used-up'
    case 'signups_paused':
      return 'paused'
    default:
      return null
  }
}
