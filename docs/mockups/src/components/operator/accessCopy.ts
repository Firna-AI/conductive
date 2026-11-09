/**
 * The words of the waitlist parts of the operator pages: the question
 * before Approve, the notice of a person who waits, the row of an approved
 * person, the app access and the referral code of a user, and the offer of
 * the Suspend question. A login goes in as the pages write it, with `@`
 * where the words need it, and a day or a time as the page writes it. This
 * module imports no fixture, so the app uses it too.
 */
import { productName } from '../../brand'

/** The person of the question before an approval. */
export type ApproveTarget = {
  login: string
  /** The name on GitHub, which some accounts do not give. */
  name?: string | null
  /** The GitHub account has a primary verified email. */
  verifiedEmail: boolean
}

/** The title of the question before an approval. */
export function approveTitle(login: string): string {
  return `Approve @${login}?`
}

/**
 * The paragraphs of the question before an approval. It names the person
 * and says that an approval is final. With a verified email, an email tells
 * them at once. Without one, no email goes out, so they see the app access
 * at their next visit.
 */
export function approveQuestion(person: ApproveTarget): readonly string[] {
  const who = person.name ?? `@${person.login}`
  return [
    person.verifiedEmail
      ? `${who} gets app access now, and an email tells them that they can come in.`
      : `${who} gets app access now, and sees it at their next visit. No email goes out, because their GitHub account has no verified email.`,
    'An approval is final. You can still suspend the user later.',
  ]
}

/** The notice at the top of the page of a person who waits. */
export function waitingNotice(
  name: string,
  since: string,
): { title: string; body: string } {
  return {
    title: `On the waitlist since ${since}`,
    body: `${name} sees only the waitlist screen until they get app access.`,
  }
}

/** The state of an approval that the operator made from the Waitlist tab. */
export const approvedLabel = 'Approved'

/**
 * The line under Approved in a row of the Waitlist tab: whether the
 * approval email went. The app sends a late email again on its own, so
 * no line asks for an action.
 */
export const approvedEmailLines = {
  sent: 'Email sent',
  pending: 'Email not sent yet',
  failed: 'Email not sent',
  none: 'No email sent',
} as const

/** The Waitlist tab with nobody on it. */
export const emptyWaitlist = {
  title: 'Nobody is waiting',
  body: 'People show here after their first sign-in, oldest first.',
} as const

/** The terms of the rows of App access on the page of a user. */
export const accessTerms = {
  how: 'How',
  since: 'Since',
  email: 'Approval email',
} as const

/**
 * The words of each way in. A link goes after the words of an invite code,
 * a referral code, and an org invitation, and an org invitation puts the
 * admin who sent it after `from`.
 */
export const wayInWords = {
  approvedBy: (operator: string) => `Approved by @${operator}`,
  inviteCode: 'Invite code',
  referralCodeOf: 'Referral code of',
  orgInvitationTo: 'Org invitation to',
  from: 'from',
  operator: 'As an operator',
  existing: 'Joined before the waitlist',
} as const

/**
 * Whether the approval email went, with a short reason under a state of an
 * email that did not go. The person keeps app access and sees it at their
 * next visit, so no state asks for an action. A state with no time of its
 * change leaves out the time.
 */
export const approvalEmailWords = {
  sent: (at: string | null) => (at === null ? 'Sent' : `Sent on ${at}`),
  pending: {
    state: 'Not sent yet',
    reason: `${productName} tries again on its own.`,
  },
  noVerifiedEmail: {
    state: 'Not sent',
    reason: 'This GitHub account has no verified email.',
  },
  stopped: (on: string | null) => ({
    state: 'Not sent',
    reason:
      on === null
        ? `${productName} stopped trying.`
        : `${productName} stopped trying on ${on}.`,
  }),
} as const

/** The words of the referral code of a user, on the page of the user. */
export const referralWords = {
  title: 'Referral code',
  code: 'Code',
  uses: 'Uses',
  usesLine: (used: number, limit: number) => `${used} of ${limit} used`,
  disabled: 'Disabled',
  disabledLine: (on: string, operator: string) => `${on} by @${operator}`,
  usedBy: 'Used by',
  usedByLabel: (code: string) => `People who used ${code}`,
} as const

/**
 * The offer of the question before the suspension of a user whose
 * referral code still lets people in. It is on by default.
 */
export const disableCodeOffer = {
  label: 'Also disable their referral code',
  hint: (code: string) =>
    `${code} then lets nobody in, also after a lift. Disable is final.`,
} as const
