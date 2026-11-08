/**
 * The orgs of the user, and the account that every org shares: the GitHub
 * sign-in, the GitHub App, and the agent connections.
 */

export const orgKeys = ['acme', 'futex', 'firna', 'labs'] as const

export type OrgKey = (typeof orgKeys)[number]

export type Org = {
  key: OrgKey
  name: string
  /** Up to two letters, which the rail shows. */
  initials: string
}

export const orgs: Readonly<Record<OrgKey, Org>> = {
  acme: { key: 'acme', name: 'Acme', initials: 'AC' },
  futex: { key: 'futex', name: 'Futex', initials: 'FX' },
  firna: { key: 'firna', name: 'Firna', initials: 'FI' },
  labs: { key: 'labs', name: 'Acme Labs', initials: 'AL' },
}

/**
 * Every org of the user, in the order of the rail. Acme Labs joins the
 * list only when Create org has made it.
 */
export const orgList: readonly Org[] = [orgs.acme, orgs.futex, orgs.firna]

/** The orgs of the user after Create org made Acme Labs. */
export const orgListWithLabs: readonly Org[] = [...orgList, orgs.labs]

/** The person signed in to the app, who signs in with GitHub only. */
export const account = {
  name: 'Cal',
  login: 'calummoore',
  initials: 'C',
} as const

/** The GitHub accounts where the shared GitHub App is installed. */
export const installations = [
  { account: 'acme', repositories: 6 },
  { account: 'futex', repositories: 4 },
  { account: 'firna', repositories: 3 },
] as const

/**
 * The account where a new user installs the app in Get started: firna,
 * which owns the repositories of Firna, the first org.
 */
export const firstInstallation = installations[2]

/**
 * An org that an admin deleted: its cloud computers stopped, and it is
 * hidden from its members until the date when everything is deleted.
 */
export const deletedOrg = {
  org: 'acme',
  deletes: '12 November',
} as const satisfies { org: OrgKey; deletes: string }

/**
 * An org that the operator suspended: its cloud computers stop, and its
 * members can open it and read everything in it, without changes.
 */
export const suspendedOrg: OrgKey = 'acme'
