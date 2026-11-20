import type { MessageSender } from '../../shared/generated/MessageSender'
import type { WorkspaceState } from '../../shared/generated/WorkspaceState'
import type { User } from '../../shared/api'
import type {
  SecretRequest,
  WorkspaceSecretValue,
} from '../../shared/secret-requests'
import {
  NEW_WORKSPACE_CAPABILITIES,
  type OrgSecret,
} from '../../shared/secrets'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { secretFixtures } from '../../test-support/fixtures/secrets'
import type { WorkspaceGrants } from '../api/read-secrets'
import { changeWorkspace, requireWorkspace, type DevBackend } from './backend'
import type { DevState, OrgState } from './state'

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
  /** The secret requests of the workspaces of the org, by request ID. */
  requests: Map<string, SecretRequest>
  /** The values that members gave for each workspace, by workspace ID. */
  values: Map<string, WorkspaceSecretValue[]>
  /**
   * The state of each workspace from before one of its requests opened, by
   * workspace ID. It comes back when the last open request ends.
   */
  idle: Map<string, WorkspaceState>
}

/** The capabilities of a workspace without a choice. */
export const noGrants: WorkspaceGrants = {
  ...NEW_WORKSPACE_CAPABILITIES,
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
    requests: new Map(),
    values: new Map(),
    idle: new Map(),
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
    orgId === FAKE_IDS.org
      ? acme()
      : {
          secrets: [],
          capabilities: new Map(),
          requests: new Map(),
          values: new Map(),
          idle: new Map(),
        }
  orgs.set(orgId, fresh)
  return fresh
}

/** The states in which the Worker shows no wait of a request. */
const ended: readonly WorkspaceState[] = ['stopped', 'error', 'archived']

/**
 * Gives a workspace the state that the Worker gives it for its secret
 * requests: `input` while a request waits or is late, and its state from
 * before when the last open request ends. It sends a change to the open
 * tabs.
 */
export function followOpenRequests(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
): void {
  const store = orgSecretsOf(backend.state, org.org.id)
  const workspace = requireWorkspace(org, workspaceId)
  const open = [...store.requests.values()].some(
    (request) =>
      request.workspaceId === workspaceId &&
      (request.state === 'waiting' || request.state === 'late'),
  )
  const opens =
    open && workspace.state !== 'input' && !ended.includes(workspace.state)
  const closes = !open && workspace.state === 'input'
  if (!opens && !closes) return
  if (opens) store.idle.set(workspaceId, workspace.state)
  const state = opens ? 'input' : (store.idle.get(workspaceId) ?? 'working')
  if (closes) store.idle.delete(workspaceId)
  changeWorkspace(backend, org, {
    ...workspace,
    state,
    updatedAt: Math.max(backend.now(), workspace.updatedAt + 1),
  })
}
