/**
 * The waitlist (decision 160). A new GitHub sign-in creates an account
 * without app access, and the person waits on the waitlist screen. An
 * operator's approval, an invite code, an invite link, or an org
 * invitation lets them in. Each user with app access has an invite code
 * with 5 invites. A code has 10 characters without look-alike characters,
 * in two groups of five.
 */

import { appDomain } from '../brand'
import type { PendingInvite } from './members'

/** A person who waits for app access, as the waitlist screen shows them. */
export const waitingPerson = {
  name: 'Sam Okafor',
  login: 'sam-okafor',
  initials: 'SO',
} as const

/**
 * The primary verified email of Sam's GitHub account. The approval email
 * goes to it, and Acme invited it.
 */
export const waitingEmail = 'sam@example.com'

/** The org invitation that waits for Sam on the waitlist screen. */
export const waitingInvites: readonly PendingInvite[] = [
  { org: 'acme', email: waitingEmail },
]

/** How many people the invite code of one user lets in. */
export const inviteLimit = 5

/** The invite code of the signed-in user, with the invites already used. */
export const ownInvite = { code: 'K7QHM-3XP2R', used: 2 } as const

/** The code that the invite link of the join page carries. */
export const linkCode = 'W9TFC-4MJ6D'

/** The code that Sam types on the waitlist screen. */
export const typedCode = 'HN4PX-7CRT9'

/** The invite link of a code, which opens the sign-in of the app. */
export function joinLink(code: string): string {
  return `https://${appDomain}/join/${code}`
}
