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

/** A secret of Jonas, which no member pre-approves or reveals. */
function jonasSecret(name: string, description: string): OrgSecret {
  return { name, description, creator: 'jonas', allAgents: false }
}

/**
 * The secrets of a larger org: those of Acme and eight more, twelve in all.
 * More than ten secrets give the secrets part of Capabilities a search.
 */
export const manySecrets: readonly OrgSecret[] = [
  ...acmeSecrets,
  jonasSecret('AWS_ACCESS_KEY_ID', 'Reads the build artifacts in S3.'),
  jonasSecret('DATADOG_API_KEY', 'Reads the dashboards and monitors.'),
  jonasSecret('FLY_API_TOKEN', 'Deploys the API to Fly.io.'),
  jonasSecret('LINEAR_API_KEY', 'Reads and updates the issues.'),
  jonasSecret('NETLIFY_TOKEN', 'Deploys the docs site to Netlify.'),
  jonasSecret('NPM_TOKEN', 'Installs the private packages of Acme.'),
  jonasSecret('SLACK_BOT_TOKEN', 'Posts build results in #checkout.'),
  jonasSecret('STRIPE_TEST_KEY', 'Runs test payments in Stripe test mode.'),
]

/**
 * A secret that Jonas added without a description. Its row in the
 * Capabilities control shows no info icon.
 */
export const undescribedSecret = jonasSecret('STAGING_API_KEY', '')

/** The search of the long list, which keeps the three deploy tokens. */
export const secretSearch = 'deploy'

/**
 * A secret that Jonas added before new names took only letters, digits,
 * and underscores. Its name stays as it is, and agents still use it. Only
 * the Replace state of the Secrets tab for an older name lists it.
 */
export const olderSecret: OrgSecret = {
  name: 'Cloudflare (read-only)',
  description: 'Reads DNS records and analytics in Cloudflare.',
  creator: 'jonas',
  allAgents: false,
}

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
 * The name of the same secret as Cal first types it, with spaces. Add
 * secret refuses it and keeps each field as he typed it.
 */
export const refusedName = 'Linear API key'

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
