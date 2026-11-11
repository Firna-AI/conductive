import { productDomain, productName } from '../brand'

/** The name that every email shows as its sender. */
export const senderName = productName

/** The address that sends every email, on the domain that Resend verifies. */
export const senderAddress = `invites@mail.${productDomain}`

/**
 * The address that gets each reply. The sender domain receives no mail, so
 * every email sends its replies here, to a mailbox that a person reads.
 */
export const replyAddress = `hello@${productDomain}`

/** The values of one org invitation. Users write the names themselves. */
export type InvitationValues = {
  orgName: string
  orgInitials: string
  /** The GitHub name of the admin who invited, or null when it has none. */
  inviterName: string | null
  inviterLogin: string
  invitedEmail: string
  /** The address of the app that opens the invitation. */
  link: string
}

/** The values of one approval email. */
export type ApprovalValues = {
  /** The address of the app that approved the person. */
  link: string
}

/** The last line of each email. */
const replyLine = 'Questions? Reply to this email.'

/** The words before the plain link, under the button of each email. */
const linkIntro = 'Or open this link:'

/** The words of an org invitation, for its HTML and its text part. */
export function invitationWords(values: InvitationValues) {
  const login = `@${values.inviterLogin}`
  const inviter = values.inviterName
    ? `${values.inviterName} (${login})`
    : login
  return {
    subject: `Join ${values.orgName} on ${productName}`,
    preview: `${values.inviterName ?? login} invited you to join ${values.orgName}.`,
    heading: `Join ${values.orgName} on ${productName}`,
    paragraphs: [
      `${inviter} invited you to join ${values.orgName}.`,
      `${productName} gives every coding task its own cloud computer, where agents powered by Claude and Codex do the work.`,
    ],
    button: 'Accept invitation',
    note: `Sign in with a GitHub account that has ${values.invitedEmail} as a verified email.`,
    linkIntro,
    footer: [
      `This invitation went to ${values.invitedEmail}. If you did not expect it, you can ignore this email.`,
      replyLine,
    ],
  } as const
}

/** The words of the approval email, for its HTML and its text part. */
export function approvalWords() {
  return {
    subject: `Your ${productName} account is ready`,
    preview: 'Sign in with GitHub to get started.',
    heading: 'Your account is ready',
    paragraphs: [
      `You can now use ${productName}. Sign in with GitHub to get started.`,
    ],
    button: `Open ${productName}`,
    linkIntro,
    footer: [
      `You got this email because you joined the ${productName} waitlist.`,
      replyLine,
    ],
  } as const
}
