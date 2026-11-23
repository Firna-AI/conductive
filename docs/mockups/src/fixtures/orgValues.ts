/**
 * The values of the proposal that combines the env vars and the secrets of
 * an org in one tab, Env & secrets. Each value keeps its kind: an env var
 * reaches every cloud computer at each start, and a secret reaches one
 * command after a grant. The list sorts both kinds by name.
 */

import { envVars, type EnvVar } from './computer'
import { acmeSecrets, figmaToken, type OrgSecret } from './secrets'

/** One value of the combined list, with its kind. */
export type OrgValue =
  | { kind: 'env'; name: string; variable: EnvVar }
  | { kind: 'secret'; name: string; secret: OrgSecret }

/** The env vars and the secrets of Acme in one list, sorted by name. */
export const acmeValues: readonly OrgValue[] = [
  ...envVars.map((variable): OrgValue => ({
    kind: 'env',
    name: variable.name,
    variable,
  })),
  ...acmeSecrets.map((secret): OrgValue => ({
    kind: 'secret',
    name: secret.name,
    secret,
  })),
].sort((a, b) => a.name.localeCompare(b.name))

/** The secret that Cal edits and renames, and its new name. */
export const editedSecret = { from: figmaToken.name, to: 'FIGMA_READ_TOKEN' }

/** The env var that Cal edits and renames, and its new name. */
export const editedVariable = {
  from: 'PLACES_API_KEY',
  to: 'GOOGLE_PLACES_API_KEY',
}

/** The env var whose menu Cal opens, and whose type he changes to secret. */
export const retypedVariable = 'STRIPE_SECRET_KEY'

/** One row of the Add modal: a name and a value. */
export type NewValue = { name: string; value: string }

/** The one empty row of the Add modal, before anything is typed. */
export const emptyRows: readonly NewValue[] = [{ name: '', value: '' }]

/**
 * The rows after Cal pastes four lines of a `.env` file into the first
 * name, such as `SENTRY_DSN=https://sentry.example`.
 */
export const pastedRows: readonly NewValue[] = [
  { name: 'SENTRY_DSN', value: 'https://sentry.example' },
  { name: 'POSTHOG_KEY', value: 'phc_9Fq2nW' },
  { name: 'REDIS_URL', value: 'redis://cache.acme.internal:6379' },
  { name: 'LOG_LEVEL', value: 'info' },
]
