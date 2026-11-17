import {
  NEW_WORKSPACE_CAPABILITIES,
  workspaceCapabilitiesPath,
} from '../../shared/secrets'
import { flag, items, record, text, texts, type JsonObject } from '../api/parse'
import type { WorkspaceGrants } from '../api/read-secrets'
import { requireOrg, requireWorkspace, type DevBackend } from './backend'
import {
  ID,
  json,
  optional,
  RouteError,
  type Params,
  type Route,
} from './router'
import { noGrants, orgSecretsOf, type OrgSecrets } from './secret-store'
import type { DevState } from './state'

function readRemovals(object: JsonObject, key: string) {
  return items(object, key, (value) => {
    const item = record(value, 'removal')
    return {
      secretId: text(item, 'secretId'),
      sessionId: text(item, 'sessionId'),
    }
  })
}

/** Refuses a set of pre-approvals that names a secret that the org lacks. */
function knownIds(store: OrgSecrets, ids: readonly string[]): string[] {
  const unique = [...new Set(ids)]
  if (unique.every((id) => store.secrets.some((item) => item.secret.id === id)))
    return unique
  throw new RouteError(404, 'secret_not_found', 'The secret is not available.')
}

/**
 * The capabilities that a create takes, as the Worker reads them: without
 * a choice, those of `NEW_WORKSPACE_CAPABILITIES`. `keep` stores them for the
 * new workspace, after the create made it.
 */
export function createdCapabilities(
  state: DevState,
  orgId: string,
  value: unknown,
) {
  const store = orgSecretsOf(state, orgId)
  const fields = value === undefined || value === null ? {} : record(value)
  const grants: WorkspaceGrants = {
    preapprovedSecretIds: knownIds(
      store,
      optional(fields, 'preapprovedSecretIds', texts) ?? [],
    ),
    macAccess:
      optional(fields, 'macAccess', flag) ??
      NEW_WORKSPACE_CAPABILITIES.macAccess,
    sessionApprovals: [],
  }
  return {
    keep: (workspaceId: string) => store.capabilities.set(workspaceId, grants),
  }
}

/**
 * The Capabilities of each workspace (secrets decision 8 B): every member
 * reads and changes them. A change answers with the whole value.
 */
export function capabilityRoutes(backend: DevBackend): Route[] {
  const path = workspaceCapabilitiesPath(ID.org, ID.workspace)
  const scope = (params: Params) => {
    const org = requireOrg(backend.state, params.org)
    requireWorkspace(org, params.workspace)
    const store = orgSecretsOf(backend.state, org.org.id)
    return {
      store,
      grants: store.capabilities.get(params.workspace) ?? noGrants,
    }
  }
  return [
    {
      method: 'GET',
      path,
      answer: ({ params }) => json({ capabilities: scope(params).grants }),
    },
    {
      method: 'PATCH',
      path,
      answer: ({ params, body }) => {
        const { store, grants } = scope(params)
        const fields = record(body)
        const ids = optional(fields, 'preapprovedSecretIds', texts)
        const removals =
          optional(fields, 'removeSessionApprovals', readRemovals) ?? []
        const next: WorkspaceGrants = {
          macAccess: optional(fields, 'macAccess', flag) ?? grants.macAccess,
          preapprovedSecretIds: ids
            ? knownIds(store, ids)
            : grants.preapprovedSecretIds,
          sessionApprovals: grants.sessionApprovals.filter(
            (approval) =>
              !removals.some(
                (removal) =>
                  removal.secretId === approval.secretId &&
                  removal.sessionId === approval.sessionId,
              ),
          ),
        }
        store.capabilities.set(params.workspace, next)
        return json({ capabilities: next })
      },
    },
  ]
}
