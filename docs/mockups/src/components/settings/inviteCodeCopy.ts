import { productName } from '../../brand'

/**
 * The states of the invite code of a user: invites left, sign-ups paused,
 * every invite used, or turned off by an operator.
 */
export const inviteStates = ['left', 'paused', 'used-up', 'disabled'] as const

export type InviteState = (typeof inviteStates)[number]

/**
 * The words of the invite code on the Account page. The page of the app
 * and its mockup share them. The user sees how many invites are left, but
 * not who used them.
 */
export const inviteCodeCopy = {
  title: 'Invite code',
  left: (left: number, limit: number) => `${left} of ${limit} invites left`,
  description:
    'Share your link. Each person who signs up with it skips the waitlist.',
  link: 'Invite link',
  copy: 'Copy',
  copyLink: 'Copy the invite link',
  /** The code alone, in backticks, for a person who types it. */
  code: (code: string) => `Or share the code \`${code}\`.`,
  paused: {
    title: 'Sign-ups are paused',
    body: 'Your link works again when sign-ups resume.',
  },
  usedUp: (limit: number) =>
    `Your invites let ${limit} people skip the waitlist.`,
  off: 'Off',
  disabled: `${productName} turned off your invite code.`,
} as const
