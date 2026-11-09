import type { SessionResponse } from '../shared/account'
import { API_PATHS } from '../shared/api'
import { WAITLIST_PATHS, type WaitlistStateResponse } from '../shared/waitlist'
import type { FakeApiServer } from './fake-api'
import { waitingState, waitingUser } from './fixtures/waitlist'

/**
 * Serves the session of Sam Okafor, who waits for app access, and the
 * waitlist state of the mockups. `email: 'none'` serves an account with no
 * verified email. The invitations stay as recorded, so a test serves the
 * invitations and the replies of a code that it needs. It returns the
 * waitlist state.
 */
export function serveWaiting(
  server: FakeApiServer,
  options: { email?: 'verified' | 'none' } = {},
): WaitlistStateResponse {
  const state: WaitlistStateResponse = {
    ...waitingState,
    approvalEmail: options.email === 'none' ? null : waitingState.approvalEmail,
  }
  server.json('GET', API_PATHS.session, {
    user: waitingUser,
    appAccess: false,
  } satisfies SessionResponse)
  server.json('GET', WAITLIST_PATHS.state, state)
  return state
}

/**
 * The error body of the API for a code that let nobody in, with the
 * status of its reply, as the Worker sends it.
 */
export function codeRefusal(
  code:
    | 'invite_code_not_found'
    | 'invite_code_disabled'
    | 'invite_code_used_up'
    | 'signups_paused',
): { status: number; body: unknown } {
  const replies = {
    invite_code_not_found: [404, 'This invite code was not found.'],
    invite_code_disabled: [409, 'This invite code is disabled.'],
    invite_code_used_up: [409, 'This invite code has no uses left.'],
    signups_paused: [403, 'Sign-ups are paused. Try again later.'],
  } as const
  const [status, message] = replies[code]
  return { status, body: { error: { code, message } } }
}
