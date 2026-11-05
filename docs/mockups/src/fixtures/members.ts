/**
 * The people of the orgs. Each person signs in with GitHub, and an owner
 * invites a member by their GitHub login. Only an owner manages the
 * members and the billing of an org, and reassigns its workspaces.
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

/** The person signed in, who owns both orgs that the mockups draw. */
export const you: PersonKey = 'cal'

/** The member of Acme who is not an owner, whose view the mockups draw. */
export const memberViewer: PersonKey = 'priya'

export type Role = 'owner' | 'member'

export const roleLabels: Readonly<Record<Role, string>> = {
  owner: 'Owner',
  member: 'Member',
}

export type Membership = { person: PersonKey; role: Role }

/** An invite that waits for its GitHub user to accept it. */
export type Invite = { login: string; sent: string }

/** The members of Acme, which is on Team, owners first. */
export const acmeMembers: readonly Membership[] = [
  { person: 'cal', role: 'owner' },
  { person: 'priya', role: 'member' },
  { person: 'jonas', role: 'member' },
]

export const acmeInvites: readonly Invite[] = [
  { login: 'mira-k', sent: '2 days ago' },
]

/** A free org has one member, its owner. */
export const firnaMembers: readonly Membership[] = [
  { person: 'cal', role: 'owner' },
]

/** The member whom the remove state removes from Acme. */
export const removedMember: PersonKey = 'priya'

/** The login that the owner of the free org tries to invite. */
export const refusedInvite = 'priyaraman'
