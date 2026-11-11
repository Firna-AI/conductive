/**
 * The invite codes that operators make, the referral codes that a search
 * finds, the pause of every way in, and the waitlist switch, as the Invite
 * codes tab shows them. Each code has 10 characters without look-alike
 * characters, in two groups of five.
 */
import { danaReferral } from './operatorAccess'
import { account } from './orgs'

/** The state of a code: it lets people in, it has no uses left, or it was disabled. */
export type CodeState = 'active' | 'used-up' | 'disabled'

type CodeBase = {
  code: string
  uses: number
  limit: number
  disabled: boolean
}

/** A code that an operator made, with its label and its own use limit. */
export type InviteCodeRow = CodeBase & {
  kind: 'invite'
  label: string
  madeBy: string
  made: string
}

/** The referral code of a user, which a search of the tab also finds. */
type ReferralCodeRow = CodeBase & { kind: 'referral'; owner: string }

export type CodeRow = InviteCodeRow | ReferralCodeRow

/** A disabled code stays disabled. Otherwise its uses decide its state. */
export function codeState(row: CodeBase): CodeState {
  if (row.disabled) return 'disabled'
  return row.uses >= row.limit ? 'used-up' : 'active'
}

/**
 * An invite code that the operator who reads the pages made, and that still
 * works unless its uses ran out.
 */
function invite(
  label: string,
  code: string,
  uses: number,
  limit: number,
  made: string,
): InviteCodeRow {
  return {
    kind: 'invite',
    label,
    code,
    uses,
    limit,
    made,
    madeBy: account.login,
    disabled: false,
  }
}

/** The code that the screens copy and that let Rhea Okafor in. */
const launchWeek = invite('Launch week', 'V7MKC-2QDXH', 12, 50, '6 Nov')

/** The code that the screens disable, which another operator made. */
export const meetupLisbon: InviteCodeRow = {
  ...invite('Meetup Lisbon', 'TQ8WN-2HKXP', 7, 30, '5 Nov'),
  madeBy: 'ellie-w',
}

/** The invite codes, newest first, as the tab lists them with no search. */
export const inviteCodes: readonly InviteCodeRow[] = [
  launchWeek,
  meetupLisbon,
  invite('Design partners', '9PTXC-4WHMN', 5, 5, '4 Nov'),
  { ...invite('Hacker News', 'HM3PE-7KWQT', 18, 100, '3 Nov'), disabled: true },
  invite('Friends', '6FJDA-9RCVY', 3, 10, '2 Nov'),
  invite('Beta testers', 'X2NRT-5GJHD', 24, 25, '1 Nov'),
]

/** The code that New code makes, with the label and the limit of the dialog. */
export const newCode = invite('Meetup Porto', '3VKRD-6PXQA', 0, 40, '8 Nov')

/** The referral code of Dana Kim, as a search of the tab finds it. */
const danaReferralRow: ReferralCodeRow = {
  kind: 'referral',
  owner: 'dana-k',
  code: danaReferral.code,
  uses: danaReferral.usedBy.length,
  limit: danaReferral.limit,
  disabled: false,
}

/** The search of the Invite codes tab, by the text of a code. */
export const codeSearches = {
  invite: { query: launchWeek.code, rows: [launchWeek] },
  referral: { query: danaReferral.code, rows: [danaReferralRow] },
  none: { query: 'Q9XWP-4MTRA', rows: [] },
} as const satisfies Record<string, { query: string; rows: readonly CodeRow[] }>

/** When and by whom an operator paused sign-ups. */
export const signUpPause = {
  since: '8 Nov at 14:20',
  by: account.login,
} as const

/**
 * When and by whom an operator turned off the waitlist. It comes before the
 * pause, because the Sign-ups box offers Turn off the waitlist only while
 * sign-ups are not paused.
 */
export const waitlistSwitch = {
  since: '8 Nov at 11:30',
  by: account.login,
} as const
