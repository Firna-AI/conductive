/**
 * The words of the Invite codes tab and of the codes on the page of a
 * user: the states and the copy buttons of a code, the dialog of New code,
 * the question before a disable, and the pause of sign-ups with its
 * question and its notice. A login goes in without `@`, and a time as the
 * page writes it. This module imports no fixture, so the app uses it too.
 */
import { productName } from '../../brand'

/** The state of a code as a word: it lets people in, its uses ran out, or it was disabled. */
export const codeStateLabels = {
  active: 'Active',
  usedUp: 'Used up',
  disabled: 'Disabled',
} as const

/** The spoken names of the copy buttons beside a code. */
export const copyLabels = {
  code: (code: string) => `Copy the code ${code}`,
  joinLink: (code: string) => `Copy the join link of ${code}`,
} as const

/** The label of a referral code in the list, in place of a label. */
export const referralCodeLabel = 'Referral code'

/** The name of a referral code in a question or a button. */
export function referralCodeName(owner: string): string {
  return `the referral code of @${owner}`
}

/** The spoken name of Disable on a row: the label or the owner of the code. */
export function disableLabel(name: string): string {
  return `Disable ${name}`
}

/** The words of New code, which makes an invite code. */
export const newCodeWords = {
  action: 'New code',
  title: 'New invite code',
  text: `${productName} makes the code at random. Copy it from the list to share it.`,
  label: 'Label',
  labelHint: 'Only operators see it.',
  limit: 'Use limit',
  limitHint: 'How many people the code lets in.',
  make: 'Make code',
} as const

/** Who keeps their app access after a disable. */
function keeps(used: number): string {
  if (used === 0) return 'Nobody has used it yet.'
  if (used === 1) return 'The person who used it keeps their app access.'
  return `The ${used} people who used it keep their app access.`
}

/**
 * The words of the question before the disable of a code. It names the
 * code, says that the people who used it keep their app access, and says
 * that Disable is final. For an invite code it says what to do instead.
 * The code goes in backticks, so the dialog shows it as code.
 */
export const disableCodeWords = {
  action: 'Disable code',
  title: (name: string) => `Disable ${name}?`,
  stops: (code: string) => `\`${code}\` stops working now.`,
  keeps,
  final: (kind: 'invite' | 'referral') =>
    kind === 'invite'
      ? 'Disable is final. To share a code again, make a new one.'
      : 'Disable is final.',
} as const

/** What the pause stops, which the question and the notice share. */
const blocked =
  'Invite codes, referral codes, and org invitations let nobody in until sign-ups resume.'

/** What still works during the pause. */
const stillOpen = 'The waitlist stays open, and Approve still works.'

/**
 * The words of the pause of sign-ups: the Sign-ups box while sign-ups are
 * open, the question before the pause, and the notice at the top of each
 * tab while the pause is on, with Resume sign-ups.
 */
export const pauseWords = {
  box: 'Sign-ups',
  open: 'Open',
  openLine:
    'Invite codes, referral codes, and org invitations let new people in.',
  pause: 'Pause sign-ups',
  resume: 'Resume sign-ups',
  question: 'Pause sign-ups?',
  questionText: [`${blocked} Each code keeps its uses.`, stillOpen],
  noticeBody: `${blocked} ${stillOpen}`,
} as const

/**
 * The title of the notice of the pause: when, and by which operator. A
 * pause with no time of its last change says only that it is on.
 */
export function pausedTitle(
  when: string | null,
  operator: string | null,
): string {
  if (when === null) return 'Sign-ups are paused'
  return operator === null
    ? `Sign-ups paused on ${when}`
    : `Sign-ups paused on ${when} by @${operator}`
}
