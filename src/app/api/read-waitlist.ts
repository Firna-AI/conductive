import type { SessionResponse } from '../../shared/account'
import type { WaitlistStateResponse } from '../../shared/waitlist'
import {
  count,
  flag,
  maybeNested,
  maybeText,
  nested,
  record,
  text,
} from './parse'
import { readUser } from './read-core'

/** The person signed in, and whether they have app access, from `SessionResponse`. */
export function readSession(value: unknown): SessionResponse {
  const session = record(value, 'session')
  return {
    user: nested(session, 'user', readUser),
    appAccess: flag(session, 'appAccess'),
  }
}

type InviteCode = NonNullable<WaitlistStateResponse['referralCode']>

function readInviteCode(value: unknown): InviteCode {
  const code = record(value, 'referralCode')
  return {
    code: text(code, 'code'),
    useLimit: count(code, 'useLimit'),
    uses: count(code, 'uses'),
    disabled: flag(code, 'disabled'),
  }
}

/**
 * The waitlist state of the person signed in, from `WaitlistStateResponse`:
 * the app access, the pause, the address of the approval email, and the
 * invite code of the person with its uses.
 */
export function readWaitlistState(value: unknown): WaitlistStateResponse {
  const state = record(value, 'waitlist')
  return {
    appAccess: flag(state, 'appAccess'),
    signupsPaused: flag(state, 'signupsPaused'),
    waitlistOn: flag(state, 'waitlistOn'),
    approvalEmail: maybeText(state, 'approvalEmail'),
    referralCode: maybeNested(state, 'referralCode', readInviteCode),
  }
}
