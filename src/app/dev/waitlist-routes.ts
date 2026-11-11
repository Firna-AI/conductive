import type { SessionResponse } from '../../shared/account'
import { API_PATHS } from '../../shared/api'
import {
  acceptOrgInvitePath,
  PENDING_ORG_INVITES_PATH,
  type AcceptOrgInviteResponse,
  type PendingOrgInvitesResponse,
} from '../../shared/members'
import {
  WAITLIST_PATHS,
  type WaitlistStateResponse,
} from '../../shared/waitlist'
import { record, text } from '../api/parse'
import { addReferralCode, findCode, referralCodeOf } from './access-codes'
import type { DevBackend } from './backend'
import { ID, json, RouteError, type Route } from './router'
import { completeStep, type DevState } from './state'

/**
 * The waitlist state of the person signed in. The pause, the waitlist
 * switch, and the referral code come from the records that the operator
 * section changes.
 */
function reply(state: DevState): WaitlistStateResponse {
  const { waitlist, operator: records } = state
  const own = waitlist.appAccess
    ? referralCodeOf(records, state.account.user.githubId)
    : undefined
  return {
    appAccess: waitlist.appAccess,
    signupsPaused: records.pause.paused,
    waitlistOn: records.waitlistSwitch.waitlistOn,
    approvalEmail: waitlist.approvalEmail,
    referralCode: own
      ? {
          code: own.code,
          useLimit: own.useLimit,
          uses: own.uses,
          disabled: own.disabledAt !== null,
        }
      : null,
  }
}

/**
 * Gives the person signed in app access, with a new referral code of 5
 * unused uses. A repeat changes nothing.
 */
function grant(backend: DevBackend): void {
  const { state } = backend
  if (state.waitlist.appAccess) return
  state.waitlist.appAccess = true
  const { githubId, githubLogin } = state.account.user
  addReferralCode(
    state.operator,
    { githubId, login: githubLogin },
    backend.now(),
  )
}

/**
 * The gate of the Worker during open sign-up: while the waitlist is off and
 * sign-ups are not paused, the next request of a person who waits gives
 * app access with a new referral code, before the request runs. It uses no
 * code, so a code of a join link stays unused. The pause wins, so a paused
 * gate lets nobody in.
 */
export function admitOpenSignup(backend: DevBackend): void {
  const { waitlist, operator: records } = backend.state
  if (waitlist.appAccess || records.pause.paused) return
  if (records.waitlistSwitch.waitlistOn) return
  grant(backend)
}

/**
 * The use of a code of the operator section, as the Worker checks it:
 * unknown, disabled, used up, then the pause. A user with app access gets
 * the state with no change.
 */
function redeemCode(backend: DevBackend, body: unknown): Response {
  const { state } = backend
  if (state.waitlist.appAccess) return json(reply(state))
  const code = findCode(state.operator, text(record(body), 'code'))
  if (!code) {
    throw new RouteError(
      404,
      'invite_code_not_found',
      'This invite code was not found.',
    )
  }
  if (code.disabledAt !== null) {
    throw new RouteError(
      409,
      'invite_code_disabled',
      'This invite code is disabled.',
    )
  }
  if (code.uses >= code.useLimit) {
    throw new RouteError(
      409,
      'invite_code_used_up',
      'This invite code has no uses left.',
    )
  }
  if (state.operator.pause.paused) {
    throw new RouteError(
      403,
      'signups_paused',
      'Sign-ups are paused. Try again later.',
    )
  }
  code.uses += 1
  grant(backend)
  return json(reply(state))
}

/**
 * Accept of an org invitation. The user joins the org, and a person who
 * waits gets app access in the same step, except during the pause.
 */
function accept(backend: DevBackend, inviteId: string): Response {
  const { state } = backend
  const { waitlist } = state
  const index = waitlist.invitations.findIndex(
    (item) => item.invite.id === inviteId,
  )
  if (index < 0) {
    throw new RouteError(
      404,
      'invite_not_found',
      'The invite is not available.',
    )
  }
  if (!waitlist.appAccess && state.operator.pause.paused) {
    throw new RouteError(
      403,
      'signups_paused',
      'Sign-ups are paused. Try again later.',
    )
  }
  const [{ org }] = waitlist.invitations.splice(index, 1)
  state.orgs = [...state.orgs, org]
  grant(backend)
  if (state.getStarted.orgId === null) {
    state.getStarted = { ...state.getStarted, orgId: org.org.id }
    completeStep(state, 'org')
  }
  return json({ org: org.org } satisfies AcceptOrgInviteResponse)
}

/**
 * The session with its app access, the waitlist state, the use of a code,
 * and the org invitations of the user with Accept. The pause, the switch,
 * and the codes are those of the operator section, so a change there shows
 * here. `admitOpenSignup` runs before each request, as the gate does.
 */
export function waitlistRoutes(backend: DevBackend): Route[] {
  const { state } = backend
  return [
    {
      method: 'GET',
      path: API_PATHS.session,
      answer: () =>
        json({
          user: state.account.user,
          appAccess: state.waitlist.appAccess,
        } satisfies SessionResponse),
    },
    {
      method: 'GET',
      path: WAITLIST_PATHS.state,
      answer: () => json(reply(state)),
    },
    {
      method: 'POST',
      path: WAITLIST_PATHS.useCode,
      answer: ({ body }) => redeemCode(backend, body),
    },
    {
      method: 'GET',
      path: PENDING_ORG_INVITES_PATH,
      answer: () =>
        json({
          invites: state.waitlist.invitations.map((item) => item.invite),
        } satisfies PendingOrgInvitesResponse),
    },
    {
      method: 'POST',
      path: acceptOrgInvitePath(ID.invite),
      answer: ({ params }) => accept(backend, params.invite),
    },
  ]
}
