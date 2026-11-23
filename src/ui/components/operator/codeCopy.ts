/**
 * The words of the Invite codes tab and of the codes on the page of a
 * user: the states and the copy buttons of a code, the dialog of New code,
 * the question before a disable, the pause of sign-ups, and the waitlist
 * switch, each with its question and its notice. A login goes in without
 * `@`, and a time as the page writes it. This module imports no fixture, so
 * the app uses it too.
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

/**
 * What the pause leaves as it is. The pause wins over the waitlist switch,
 * so new people also wait while the waitlist is off. Approve still works.
 */
const stillOpen =
  'New people wait, also while the waitlist is off. Approve still works.'

/**
 * The words of the pause of sign-ups: the Sign-ups box while sign-ups are
 * not paused, the question before the pause, and the notice at the top of
 * each tab while the pause is on, with Resume sign-ups.
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

/**
 * The people who wait when the question before Turn off the waitlist
 * opens. Each of them gets app access at their next visit. The question
 * always says that no email goes out, also when nobody waits.
 */
function waitingNow(count: number): string {
  const noEmail = 'No email goes out.'
  if (count === 0) return `Nobody is waiting now. ${noEmail}`
  const later = `at their next visit. ${noEmail}`
  return count === 1
    ? `1 person waits now. They get app access ${later}`
    : `${count} people wait now. Each of them gets app access ${later}`
}

/** What open sign-up gives, which the question and the notice share. */
const eachSignIn = 'Each new sign-in gets app access at once.'

/** When the people on the waitlist get in during open sign-up. */
const nextVisit = 'People on the waitlist get it at their next visit.'

/**
 * The words of the waitlist switch: its state in the Sign-ups box, the
 * question before Turn off the waitlist, and the notice at the top of each
 * tab while the waitlist is off, with Turn on the waitlist. Turn on acts at
 * once, because it brings back the usual state. While the pause is on, the
 * notice says that open sign-up waits for the end of the pause. The button
 * of the question says only Turn off, so that it fits beside Cancel in the
 * sheet of a phone.
 */
export const waitlistWords = {
  on: 'Waitlist on',
  turnOff: 'Turn off the waitlist',
  turnOn: 'Turn on the waitlist',
  question: 'Turn off the waitlist?',
  confirmOff: 'Turn off',
  questionText: (waiting: number): readonly string[] => [
    eachSignIn,
    waitingNow(waiting),
    'Nobody loses app access when you turn the waitlist on again.',
  ],
  noticeBody: `${eachSignIn} ${nextVisit}`,
  noticeBodyPaused: `When sign-ups resume, each new sign-in gets app access at once. ${nextVisit}`,
} as const

/**
 * The title of the notice of the waitlist switch: when, and by which
 * operator, the waitlist was turned off. A switch with no time of its last
 * change says only that the waitlist is off.
 */
export function waitlistOffTitle(
  when: string | null,
  operator: string | null,
): string {
  if (when === null) return 'The waitlist is off'
  return operator === null
    ? `Waitlist turned off on ${when}`
    : `Waitlist turned off on ${when} by @${operator}`
}
