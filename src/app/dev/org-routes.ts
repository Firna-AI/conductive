import { API_PATHS, orgPath } from '../../shared/api'
import { membersPath, type MembersResponse } from '../../shared/members'
import {
  deleteOrgPath,
  restoreOrgPath,
  type OrgResponse,
  type OrgsResponse,
  type OrgSummary,
} from '../../shared/orgs'
import { record, text, type JsonObject } from '../api/parse'
import { requireOrg, type DevBackend } from './backend'
import {
  ID,
  json,
  numbers,
  optional,
  requiredText,
  type Params,
  type Route,
} from './router'
import {
  completeStep,
  freshOrg,
  slugify,
  uniqueId,
  type OrgState,
} from './state'

/** A deleted org stays for 7 days, and an admin can restore it. */
const DELETE_AFTER = 604_800_000

function orgReply(org: OrgSummary, status = 200): Response {
  return json({ org } satisfies OrgResponse, status)
}

/** The org of a create or a rename, with the initials when the request has them. */
function withInitials(org: OrgSummary, fields: JsonObject): OrgSummary {
  const initials = optional(fields, 'initials', text)
  return initials === undefined ? org : { ...org, initials }
}

/**
 * Create org. The new org has its own state, as `freshOrg` says: the
 * repositories of the account catalogue, with the GitHub IDs of the
 * request added. When the user has no org yet, the new org becomes the
 * org of Get started.
 */
function createOrg(backend: DevBackend, body: unknown): Response {
  const { state } = backend
  const fields = record(body)
  const name = requiredText(fields, 'name')
  const chosen = optional(fields, 'repositoryIds', numbers) ?? []
  const id = uniqueId(
    slugify(name, 'org'),
    state.orgs.map((item) => item.org.id),
  )
  const org = freshOrg(
    withInitials({ id, name, role: 'admin' }, fields),
    state.account.user,
    backend.now(),
    chosen,
  )
  state.orgs = [...state.orgs, org]
  if (state.getStarted.orgId === null) {
    state.getStarted = { ...state.getStarted, orgId: id }
    completeStep(state, 'org')
  }
  return orgReply(org.org, 201)
}

/** Rename. A request without initials keeps the saved ones. */
function renameOrg(org: OrgState, body: unknown): Response {
  const fields = record(body)
  org.org = withInitials(
    { ...org.org, name: requiredText(fields, 'name') },
    fields,
  )
  return orgReply(org.org)
}

function deleteOrg(backend: DevBackend, org: OrgState): Response {
  const deletedAt = backend.now()
  org.org = {
    ...org.org,
    deletion: { deletedAt, deletesAt: deletedAt + DELETE_AFTER },
  }
  return orgReply(org.org)
}

/** Restore brings the org back as it was, with its initials. */
function restoreOrg(org: OrgState): Response {
  const { id, name, role, initials } = org.org
  org.org =
    initials === undefined ? { id, name, role } : { id, name, role, initials }
  return orgReply(org.org)
}

/** The orgs of the user, their names, their deletion, and their members. */
export function orgRoutes(backend: DevBackend): Route[] {
  const { state } = backend
  const orgOf = (params: Params) => requireOrg(state, params.org)
  return [
    {
      method: 'GET',
      path: API_PATHS.orgs,
      answer: () =>
        json({
          orgs: state.orgs.map((item) => item.org),
        } satisfies OrgsResponse),
    },
    {
      method: 'POST',
      path: API_PATHS.orgs,
      answer: ({ body }) => createOrg(backend, body),
    },
    {
      method: 'GET',
      path: orgPath(ID.org),
      answer: ({ params }) => orgReply(orgOf(params).org),
    },
    {
      method: 'PATCH',
      path: orgPath(ID.org),
      answer: ({ params, body }) => renameOrg(orgOf(params), body),
    },
    {
      method: 'POST',
      path: deleteOrgPath(ID.org),
      answer: ({ params }) => deleteOrg(backend, orgOf(params)),
    },
    {
      method: 'POST',
      path: restoreOrgPath(ID.org),
      answer: ({ params }) => restoreOrg(orgOf(params)),
    },
    {
      method: 'GET',
      path: membersPath(ID.org),
      answer: ({ params }) =>
        json(orgOf(params).members satisfies MembersResponse),
    },
  ]
}
