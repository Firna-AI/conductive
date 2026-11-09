import {
  codeState,
  inviteCodes,
  type CodeState,
  type InviteCodeRow,
} from '../../../docs/mockups/src/fixtures/operatorCodes'
import {
  inviteLimit,
  ownInvite,
  waitingEmail,
  waitingPerson,
} from '../../../docs/mockups/src/fixtures/waitlist'
import type { User } from '../../shared/api'
import type { WaitlistStateResponse } from '../../shared/waitlist'
import { fakeUsers } from './core'

/** Sam Okafor of the waitlist mockups, who waits for app access. */
export const waitingUser: User = {
  id: 'sam',
  githubId: fakeUsers.length + 1,
  githubLogin: waitingPerson.login,
  displayName: waitingPerson.name,
  avatarUrl: null,
}

/** The invite code of a user who has app access, with its uses. */
export function ownInviteCode(uses: number = ownInvite.used) {
  return {
    code: ownInvite.code,
    useLimit: inviteLimit,
    uses,
    disabled: false,
  }
}

/**
 * The waitlist state of the user with app access: no pause, and the invite
 * code of the mockups with 2 of its 5 invites used.
 */
export const accessState: WaitlistStateResponse = {
  appAccess: true,
  signupsPaused: false,
  waitlistOn: true,
  approvalEmail: null,
  referralCode: ownInviteCode(),
}

/** The waitlist state of Sam, who waits with a verified email. */
export const waitingState: WaitlistStateResponse = {
  appAccess: false,
  signupsPaused: false,
  waitlistOn: true,
  approvalEmail: waitingEmail,
  referralCode: null,
}

/** The first invite code of the operator mockups in a state. */
function sampleCode(state: CodeState): InviteCodeRow {
  const row = inviteCodes.find((item) => codeState(item) === state)
  if (!row) throw new Error(`The mockups have no ${state} invite code.`)
  return row
}

/**
 * The invite codes of the operator mockups, as the use of a code finds
 * them: one that works, one that is used up, and one that is disabled.
 */
export const sampleCodes = {
  works: sampleCode('active'),
  usedUp: sampleCode('used-up'),
  disabled: sampleCode('disabled'),
} as const
