import {
  operatorCodesPath,
  operatorSignupPausePath,
  operatorWaitlistPath,
  type OperatorApprovalEmail,
  type OperatorApprovalResponse,
} from '../../shared/operator-waitlist'
import { operatorUsersPath } from '../../shared/operator'
import {
  codeReply,
  sampleUserAccess,
} from '../../test-support/fixtures/operator-access'
import type { SampleIdentity } from '../../test-support/fixtures/operator-access-samples'
import type { SampleUser } from '../../test-support/fixtures/operator-samples'
import { record } from '../api/parse'
import type { DevBackend } from './backend'
import { searchCodes, searchWaitlist } from './operator-search'
import { ID, json, RouteError, type Route } from './router'

/** What these routes share with the other operator routes of the dev fake. */
export interface OperatorRouteKit {
  backend: DevBackend
  /** The time from which the samples count their days back. */
  base: number
  /** Refuses anyone who is not an operator, as the Worker does. */
  guard: () => void
  /** The sample user of the GitHub ID of a path, or a 404. */
  userOf: (githubId: string) => SampleUser
  /** The operator who sends the request. */
  operator: () => SampleIdentity
}

/** The code part of the path of a disable, which the route reads as `params.code`. */
const CODE = ':code'

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'

/**
 * A code that no other code has, in two groups of five, as the Worker
 * makes it. It comes from `seed`, so a run of the dev fake can repeat it.
 */
function freshCode(taken: ReadonlyMap<string, unknown>, seed: number): string {
  let value = (Math.abs(Math.trunc(seed)) % 2_147_483_646) + 1
  for (;;) {
    let text = ''
    for (let index = 0; index < 10; index += 1) {
      value = (value * 48_271) % 2_147_483_647
      text += ALPHABET[value % ALPHABET.length]
    }
    const code = `${text.slice(0, 5)}-${text.slice(5)}`
    if (!taken.has(code)) return code
  }
}

/**
 * The approval email of the dev fake. A person with no verified email gets
 * none. The email of Sam Okafor does not go at once, as in the mockups, so
 * the app tries again on its own.
 */
function approvalEmail(
  user: SampleUser,
  verified: boolean,
  at: number,
): OperatorApprovalEmail {
  if (!verified) return { state: 'none', updatedAt: at }
  return {
    state: user.login === 'sam-okafor' ? 'pending' : 'sent',
    updatedAt: at,
  }
}

/**
 * The waitlist, the codes, and the pause of the dev fake, over the records
 * of the samples. An approval gives the person a referral code, as the
 * grant of the Worker does. The records last until the page loads again.
 */
export function operatorWaitlistRoutes(kit: OperatorRouteKit): Route[] {
  const { backend, base, guard, userOf, operator } = kit
  const records = () => backend.state.operator
  const changePause = (paused: boolean) => {
    guard()
    const pause = records().pause
    if (pause.paused !== paused) {
      records().pause = {
        paused,
        updatedAt: backend.now(),
        operator: operator(),
      }
    }
    return json(records().pause)
  }
  return [
    {
      method: 'GET',
      path: operatorWaitlistPath(),
      answer: ({ query }) => {
        guard()
        return json(searchWaitlist(records(), base, query))
      },
    },
    {
      method: 'POST',
      path: `${operatorUsersPath()}/${ID.user}/approval`,
      answer: ({ params }) => {
        const user = userOf(params.user)
        if (records().userSuspensions.has(user.githubId)) {
          throw new RouteError(
            409,
            'user_suspended',
            'Lift this account suspension before approval.',
          )
        }
        const access = sampleUserAccess(user, records(), base)
        const reply = (changed: boolean, email: OperatorApprovalEmail) =>
          json({
            githubId: user.githubId,
            changed,
            approvalEmail: email,
            emailFailed: changed && email.state === 'pending',
          } satisfies OperatorApprovalResponse)
        if (access.appAccess.state === 'granted') {
          return reply(false, access.approvalEmail)
        }
        const approvedAt = backend.now()
        const email = approvalEmail(user, access.hasVerifiedEmail, approvedAt)
        records().approvals.set(user.githubId, {
          approvedAt,
          operator: operator(),
          email,
        })
        const code = freshCode(records().codes, user.githubId)
        records().codes.set(code, {
          code,
          kind: 'referral',
          label: null,
          owner: { githubId: user.githubId, login: user.login },
          createdBy: null,
          createdAt: approvedAt,
          useLimit: 5,
          uses: 0,
          disabledAt: null,
          disabledBy: null,
        })
        return reply(true, email)
      },
    },
    {
      method: 'GET',
      path: operatorCodesPath(),
      answer: ({ query }) => {
        guard()
        return json(searchCodes(records(), query))
      },
    },
    {
      method: 'POST',
      path: operatorCodesPath(),
      answer: ({ body }) => {
        guard()
        const fields = record(body)
        const label =
          typeof fields.label === 'string' ? fields.label.trim() : ''
        const { useLimit } = fields
        if (
          label === '' ||
          label.length > 80 ||
          typeof useLimit !== 'number' ||
          !Number.isSafeInteger(useLimit) ||
          useLimit < 1
        ) {
          throw new RouteError(
            400,
            'invalid_invite_code',
            'Enter a label of up to 80 characters and a whole use limit of 1 or more.',
          )
        }
        const now = backend.now()
        const code = freshCode(records().codes, now + records().codes.size)
        const made = {
          code,
          kind: 'invite' as const,
          label,
          owner: null,
          createdBy: operator(),
          createdAt: now,
          useLimit,
          uses: 0,
          disabledAt: null,
          disabledBy: null,
        }
        records().codes.set(code, made)
        return json(codeReply(made), 201)
      },
    },
    {
      method: 'POST',
      path: `${operatorCodesPath()}/${CODE}/disable`,
      answer: ({ params }) => {
        guard()
        const key = params.code.trim().toUpperCase()
        const found = [...records().codes.values()].find(
          (code) => code.code.replace('-', '') === key.replace('-', ''),
        )
        if (!found) {
          throw new RouteError(
            404,
            'invite_code_not_found',
            'This invite code was not found.',
          )
        }
        if (found.disabledAt === null) {
          found.disabledAt = backend.now()
          found.disabledBy = operator()
        }
        return json(codeReply(found))
      },
    },
    {
      method: 'GET',
      path: operatorSignupPausePath(),
      answer: () => {
        guard()
        return json(records().pause)
      },
    },
    {
      method: 'POST',
      path: operatorSignupPausePath(),
      answer: () => changePause(true),
    },
    {
      method: 'DELETE',
      path: operatorSignupPausePath(),
      answer: () => changePause(false),
    },
  ]
}
