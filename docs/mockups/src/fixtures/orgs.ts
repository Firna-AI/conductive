/**
 * The orgs of the user, and the account that every org shares: the GitHub
 * sign-in, the GitHub App, and the agent connections.
 */

export const orgKeys = ['acme', 'futex', 'firna'] as const

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
}

/** Every org of the user, in the order of the rail. */
export const orgList: readonly Org[] = orgKeys.map((key) => orgs[key])

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
