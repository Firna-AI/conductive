import type { MessageSender } from '../../shared/generated/MessageSender'
import type { User } from '../../shared/api'
import type { OrgSecret } from '../../shared/secrets'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { secretFixtures } from '../../test-support/fixtures/secrets'
import type { WorkspaceGrants } from '../api/read-secrets'
import type { DevState } from './state'

/** A secret of the dev fake with its value, which only a reveal gives back. */
export interface DevSecret {
  secret: OrgSecret
  value: string
}

/** The secrets of one org, and the capabilities of its workspaces. */
export interface OrgSecrets {
  /** In the order of the list of the Worker: by name. */
  secrets: DevSecret[]
  /** By workspace ID. A workspace without an entry has `noGrants`. */
  capabilities: Map<string, WorkspaceGrants>
}

/** The capabilities of a workspace without a choice (secrets decision 9 A). */
export const noGrants: WorkspaceGrants = {
  preapprovedSecretIds: [],
  macAccess: true,
  sessionApprovals: [],
}

/** The sender record of a person, as the Worker joins it to a record. */
export function senderOf(user: User): MessageSender {
  return {
    id: user.id,
    githubLogin: user.githubLogin,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}

/**
 * The secrets of Acme in the mockups, with made-up values, and the grants of
 * `checkout-autocomplete`, as `secretFixtures` gives them.
 */
function acme(): OrgSecrets {
  const { secrets, values, grants } = secretFixtures()
  return {
    secrets: secrets.map((secret) => ({
      secret,
      value: values[secret.id] ?? '',
    })),
    capabilities: new Map([[FAKE_IDS.workspace, grants]]),
  }
}

const stores = new WeakMap<DevState, Map<string, OrgSecrets>>()

/**
 * The secrets of an org in the state of the page, which a reload starts
 * again. Acme starts with the secrets of the mockups, and every other org
 * with none.
 */
export function orgSecretsOf(state: DevState, orgId: string): OrgSecrets {
  const orgs = stores.get(state) ?? new Map<string, OrgSecrets>()
  stores.set(state, orgs)
  const found = orgs.get(orgId)
  if (found) return found
  const fresh =
    orgId === FAKE_IDS.org ? acme() : { secrets: [], capabilities: new Map() }
  orgs.set(orgId, fresh)
  return fresh
}
