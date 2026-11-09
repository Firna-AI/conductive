import { inviteCodes } from '../../../docs/mockups/src/fixtures/operatorCodes'
import {
  inviteLimit,
  ownInvite,
} from '../../../docs/mockups/src/fixtures/waitlist'
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
import type { DevBackend } from './backend'
import type { DevInviteCode } from './options'
import { ID, json, RouteError, type Route } from './router'
import { completeStep, type DevCode, type DevWaitlist } from './state'

/** A code as the Worker finds it: in capitals, with or without its hyphen. */
function codeKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/^(.{5})-(.{5})$/, '$1$2')
}

/** A code in two groups of five, as the app shows it. */
function shown(key: string): string {
  return key.length === 10 ? `${key.slice(0, 5)}-${key.slice(5)}` : key
}

/**
 * The waitlist when the app opens: the invite codes of the operator
 * mockups, and the invite code of a user with app access, in the state of
 * `inviteCode`. A person who waits has no code of their own yet.
 */
export function seedWaitlist(options: {
  appAccess: boolean
  approvalEmail: string | null
  paused: boolean
  inviteCode: DevInviteCode
  invitations: DevWaitlist['invitations']
}): DevWaitlist {
  const codes = new Map<string, DevCode>(
    inviteCodes.map((row) => [
      codeKey(row.code),
      { useLimit: row.limit, uses: row.uses, disabled: row.disabled },
    ]),
  )
  const own = codeKey(ownInvite.code)
  if (options.appAccess) {
    codes.set(own, {
      useLimit: inviteLimit,
      uses: options.inviteCode === 'used-up' ? inviteLimit : ownInvite.used,
      disabled: options.inviteCode === 'disabled',
    })
  }
  return {
    appAccess: options.appAccess,
    approvalEmail: options.approvalEmail,
    paused: options.paused,
    codes,
    ownCode: options.appAccess ? own : null,
    invitations: options.invitations,
  }
}

function reply(waitlist: DevWaitlist): WaitlistStateResponse {
  const own = waitlist.ownCode
  const code = own === null ? undefined : waitlist.codes.get(own)
  return {
    appAccess: waitlist.appAccess,
    signupsPaused: waitlist.paused,
    approvalEmail: waitlist.approvalEmail,
    referralCode:
      own === null || code === undefined ? null : { code: shown(own), ...code },
  }
}

/** Gives app access with a new invite code of 5 unused invites. A repeat changes nothing. */
function grant(waitlist: DevWaitlist): void {
  if (waitlist.appAccess) return
  waitlist.appAccess = true
  const own = codeKey(ownInvite.code)
  waitlist.codes.set(own, { useLimit: inviteLimit, uses: 0, disabled: false })
  waitlist.ownCode = own
}

/**
 * The use of a code, as the Worker checks it: unknown, disabled, used up,
 * then the pause. A user with app access gets the state with no change.
 */
function redeemCode(waitlist: DevWaitlist, body: unknown): Response {
  if (waitlist.appAccess) return json(reply(waitlist))
  const code = waitlist.codes.get(codeKey(text(record(body), 'code')))
  if (!code) {
    throw new RouteError(
      404,
      'invite_code_not_found',
      'This invite code was not found.',
    )
  }
  if (code.disabled) {
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
  if (waitlist.paused) {
    throw new RouteError(
      403,
      'signups_paused',
      'Sign-ups are paused. Try again later.',
    )
  }
  code.uses += 1
  grant(waitlist)
  return json(reply(waitlist))
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
  if (!waitlist.appAccess && waitlist.paused) {
    throw new RouteError(
      403,
      'signups_paused',
      'Sign-ups are paused. Try again later.',
    )
  }
  const [{ org }] = waitlist.invitations.splice(index, 1)
  state.orgs = [...state.orgs, org]
  grant(waitlist)
  if (state.getStarted.orgId === null) {
    state.getStarted = { ...state.getStarted, orgId: org.org.id }
    completeStep(state, 'org')
  }
  return json({ org: org.org } satisfies AcceptOrgInviteResponse)
}

/**
 * The session with its app access, the waitlist state, the use of a code,
 * and the org invitations of the user with Accept.
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
      answer: () => json(reply(state.waitlist)),
    },
    {
      method: 'POST',
      path: WAITLIST_PATHS.useCode,
      answer: ({ body }) => redeemCode(state.waitlist, body),
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
