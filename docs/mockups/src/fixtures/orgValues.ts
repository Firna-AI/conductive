/**
 * The values of the proposal that combines the env vars and the secrets of
 * an org in the Secrets tab (item 1 B of 17 November 2026, open). Each value
 * keeps its kind: an env var reaches every cloud computer at each start, and
 * a secret reaches one command after a grant. The list sorts both kinds by
 * name.
 */

import { envVars, type EnvVar } from './computer'
import { acmeSecrets, figmaToken, type OrgSecret } from './secrets'

/** One value of the combined list, with its kind. */
export type OrgValue =
  | { kind: 'start'; name: string; variable: EnvVar }
  | { kind: 'approval'; name: string; secret: OrgSecret }

/** The env vars and the secrets of Acme in one list, sorted by name. */
export const acmeValues: readonly OrgValue[] = [
  ...envVars.map((variable): OrgValue => ({
    kind: 'start',
    name: variable.name,
    variable,
  })),
  ...acmeSecrets.map((secret): OrgValue => ({
    kind: 'approval',
    name: secret.name,
    secret,
  })),
].sort((a, b) => a.name.localeCompare(b.name))

/** The secret that Cal renames, and its new name. */
export const renamedSecret = { from: figmaToken.name, to: 'FIGMA_READ_TOKEN' }

/** The env var that Cal renames, and its new name. */
export const renamedVariable = {
  from: 'PLACES_API_KEY',
  to: 'GOOGLE_PLACES_API_KEY',
}

/** The env var that Cal moves, so that agents ask before each use. */
export const movedVariable = 'STRIPE_SECRET_KEY'

/** A value for each start that Cal adds, with the name typed and a value. */
export const newStartValue = {
  name: 'SENTRY_DSN',
  value: 'https://sentry.example',
} as const
