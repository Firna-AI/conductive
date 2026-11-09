import { productName } from '../brand'

/**
 * Why a code did not let a person in: no code has its text, an operator
 * disabled it, its uses are gone, or sign-ups are paused. A code that the
 * pause stopped stays unused.
 */
export const codeFailures = [
  'unknown',
  'disabled',
  'used-up',
  'paused',
] as const

type CodeFailure = (typeof codeFailures)[number]

/** A failure that is the code's own, not the pause. */
type CodeProblem = Exclude<CodeFailure, 'paused'>

/** A notice with its title and one line of what to do. */
type NoticeText = { title: string; body: string }

/** A typed code that did not work, under the field. */
const typed: Readonly<Record<CodeProblem, string>> = {
  unknown: "That code wasn't found. Check it and try again.",
  disabled: 'That code no longer works. Ask for another one.',
  'used-up': 'That code is used up. Ask for another one.',
}

/** The code of a join link that did not work, after the sign-in. */
const link: Readonly<Record<CodeProblem, NoticeText>> = {
  unknown: {
    title: "Your invite link didn't work",
    body: 'Check the link, then open it again.',
  },
  disabled: {
    title: 'Your invite link no longer works',
    body: 'Ask for another invite.',
  },
  'used-up': {
    title: 'Your invite link is used up',
    body: 'Ask for another invite.',
  },
}

/**
 * The words of the waitlist screen of a person without app access, and of
 * the invite code on the sign-in page of a join link. The screens of the
 * app and their mockups share them. They name no place in line, because
 * operators approve people in any order.
 */
export const waitlistCopy = {
  title: "You're on the waitlist",
  /** The approval email, to the primary verified email on GitHub. */
  email: (address: string) =>
    `You'll get an email at ${address} when you're approved.`,
  /** No verified email on GitHub, so no email goes out at the approval. */
  noEmail: `${productName} opens here once you're approved.`,
  invitations: 'Accept an invitation to join its org and skip the waitlist.',
  codeLabel: 'Invite code',
  codePlaceholder: 'XXXXX-XXXXX',
  useCode: 'Use code',
  signOut: 'Sign out',
  /** The code that comes with a join link, on its sign-in page. */
  linkCode: 'Your invite code comes with this link',
  typed,
  link,
  /** A code that the pause stopped, from the field or from a link. */
  paused: {
    title: 'Sign-ups are paused',
    typed: 'Try your code again later. It stays unused.',
    link: 'Open your invite link again later. Its code stays unused.',
  },
} as const
