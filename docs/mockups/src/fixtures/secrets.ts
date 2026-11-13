/**
 * The secrets of the orgs (secrets decisions 1 to 3). A secret is a named
 * value of an org that an agent uses in one command, after a member allows
 * it. Its value is encrypted, and no list holds it. Only an admin reveals
 * one value at a time, and the app records each reveal.
 */

import type { PersonKey } from './members'

/** The last reveal of a value: the admin and the time. */
type SecretReveal = { by: PersonKey; when: string }

export type OrgSecret = {
  /** The name that an agent asks for, such as `PROD_DATABASE_URL`. */
  name: string
  /** What the value is for, which the request card shows. */
  description: string
  /** The member who added it. That member and the admins replace it. */
  creator: PersonKey
  /**
   * Available to all agents: each session of the org uses it with no
   * question. Only an admin sets or clears the mark.
   */
  allAgents: boolean
  /** The last reveal of the value, which its row shows. */
  revealed?: SecretReveal
}

/** A design token that Priya added for the checkout work. */
export const figmaToken: OrgSecret = {
  name: 'FIGMA_TOKEN',
  description: 'Reads the checkout designs in Figma.',
  creator: 'priya',
  allAgents: false,
}

/** The read-only replica of the production database, which Cal added. */
export const replicaUrl: OrgSecret = {
  name: 'PROD_DATABASE_URL',
  description: 'Read-only replica of the production database.',
  creator: 'cal',
  allAgents: false,
  revealed: { by: 'cal', when: '2 days ago' },
}

/** A token that every agent of Acme uses with no question. */
const sentryToken: OrgSecret = {
  name: 'SENTRY_AUTH_TOKEN',
  description: 'Uploads source maps and reads issues in Sentry.',
  creator: 'jonas',
  allAgents: true,
}

/** The token of the preview deploys, which Priya added. */
export const vercelToken: OrgSecret = {
  name: 'VERCEL_TOKEN',
  description: 'Deploys preview builds to Vercel.',
  creator: 'priya',
  allAgents: false,
  revealed: { by: 'cal', when: '5 Nov' },
}

/** The secrets of Acme, by name. */
export const acmeSecrets: readonly OrgSecret[] = [
  figmaToken,
  replicaUrl,
  sentryToken,
  vercelToken,
]

/** The value of `PROD_DATABASE_URL`, which Cal reveals. */
export const revealedValue =
  'postgres://readonly:Vb7q2mXkL9@replica.acme.internal:5432/acme'

/** The secret that Add secret makes, with its fields filled in. */
export const newSecret = {
  name: 'LINEAR_API_KEY',
  description: 'Reads and updates the issues of the checkout team.',
  value: 'lin_api_4f8Kq2nWx7',
} as const

/**
 * The secret whose value changes: Cal, an admin, replaces a secret of
 * Priya, and Priya replaces one of her own.
 */
export const replacedSecrets = {
  admin: vercelToken.name,
  member: figmaToken.name,
} as const

/** The secret that Delete asks about. */
export const deletedSecret = vercelToken
