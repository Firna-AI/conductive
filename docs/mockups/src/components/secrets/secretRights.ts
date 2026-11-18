import type { PersonKey } from '../../fixtures/members'
import type { OrgSecret } from '../../fixtures/secrets'

/**
 * Who reads the Secrets tab: an admin, a member who is not an admin, or
 * anyone in a suspended org, where nothing can change.
 */
export type SecretsAccess =
  | { kind: 'admin'; person: PersonKey }
  | { kind: 'member'; person: PersonKey }
  | { kind: 'suspended'; person: PersonKey }

/** What the person signed in can do with one secret. */
export type SecretRights = {
  /** Reveal its value, which the app records. */
  reveal: boolean
  /** Set or clear the mark for all agents. */
  mark: boolean
  /** Replace its value, and delete it. */
  change: boolean
}

/**
 * The rights of secrets decisions 2 and 3. Every member adds secrets. A
 * member replaces and deletes only the secrets that they added, and sees
 * each value hidden. An admin replaces and deletes each secret, sets the
 * mark for all agents, and reveals one value at a time. A suspended org
 * changes nothing. The app reads the same rule.
 */
export function secretRights(
  secret: OrgSecret,
  access: SecretsAccess,
): SecretRights {
  switch (access.kind) {
    case 'admin':
      return { reveal: true, mark: true, change: true }
    case 'member':
      return {
        reveal: false,
        mark: false,
        change: secret.creator === access.person,
      }
    case 'suspended':
      return { reveal: false, mark: false, change: false }
  }
}

/** Whether the person signed in can add a secret: every member can. */
export function mayAddSecret(access: SecretsAccess): boolean {
  return access.kind !== 'suspended'
}
