/**
 * The people of the orgs. Each person signs in with GitHub. An admin
 * invites a person by email, and the person joins with a GitHub account
 * that has that email verified (decision 78). Only an admin manages the
 * members of an org and reassigns its workspaces (decision 54).
 */

import { account } from './orgs'

export const personKeys = ['cal', 'priya', 'jonas'] as const

export type PersonKey = (typeof personKeys)[number]

export type Person = {
  key: PersonKey
  name: string
  login: string
  /** Up to two letters, which an avatar shows. */
  initials: string
}

export const people: Readonly<Record<PersonKey, Person>> = {
  cal: { key: 'cal', ...account },
  priya: {
    key: 'priya',
    name: 'Priya Raman',
    login: 'priyaraman',
    initials: 'PR',
  },
  jonas: {
    key: 'jonas',
    name: 'Jonas Weber',
    login: 'jonasweber',
    initials: 'JW',
  },
}

/** The person signed in, an admin of both orgs that the mockups draw. */
export const you: PersonKey = 'cal'

/** The member of Acme who is not an admin, whose view the mockups draw. */
export const memberViewer: PersonKey = 'priya'

/** The roles of an org, as in Conductor (decision 54). */
export type Role = 'admin' | 'member'

export const roleLabels: Readonly<Record<Role, string>> = {
  admin: 'Admin',
  member: 'Member',
}

export type Membership = { person: PersonKey; role: Role }

/**
 * An invite that waits for its person to accept it, with a GitHub account
 * that has its email verified.
 */
export type Invite = { email: string; sent: string }

/** The members of Acme, admins first. */
export const acmeMembers: readonly Membership[] = [
  { person: 'cal', role: 'admin' },
  { person: 'priya', role: 'member' },
  { person: 'jonas', role: 'member' },
]

export const acmeInvites: readonly Invite[] = [
  { email: 'mira@example.com', sent: '2 days ago' },
]

/** The member whom the remove state removes from Acme. */
export const removedMember: PersonKey = 'priya'
