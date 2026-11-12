import { API_PATHS, orgPath } from '../../shared/api'
import { membersPath, type MembersResponse } from '../../shared/members'
import {
  deleteOrgPath,
  leaveOrgPath,
  restoreOrgPath,
  type OrgResponse,
  type OrgsResponse,
  type OrgSummary,
} from '../../shared/orgs'
import { record, text, type JsonObject } from '../api/parse'
import { requireOrg, type DevBackend } from './backend'
import { startBuild } from './build-routes'
import { newOrgAccount } from './provider-routes'
import {
  ID,
  json,
  numbers,
  optional,
  requiredText,
  RouteError,
  type Params,
  type Route,
} from './router'
import {
  completeStep,
  freshOrg,
  slugify,
  uniqueId,
  type DevState,
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
 * repositories chosen by the request, and a running first build. When the
 * user has no org yet, the new org becomes the org of Get started. Its
 * provider account is the choice of an operator, or a draw from the
 * weights, as the Worker does, and the operator section lists it.
 */
function createOrg(backend: DevBackend, body: unknown): Response {
  const { state } = backend
  const fields = record(body)
  const name = requiredText(fields, 'name')
  const chosen = optional(fields, 'repositoryIds', numbers) ?? []
  if (chosen.length === 0)
    throw new RouteError(
      400,
      'repository_required',
      'Choose at least one repository.',
    )
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
  const choice = optional(fields, 'providerAccount', text) ?? null
  state.providers.made.set(id, {
    providerAccount: newOrgAccount(
      state.providers,
      choice,
      state.account.operator,
    ),
    createdAt: backend.now(),
  })
  state.orgs = [...state.orgs, org]
  startBuild(backend, org)
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

/**
 * Get started after a leave of its org, as on the Worker: the next org that
 * is not deleted takes its place. Without one, the org step opens again.
 */
function leaveSetupOrg(state: DevState, orgId: string): void {
  if (state.getStarted.orgId !== orgId) return
  const next = state.orgs.find((item) => !item.org.deletion)?.org.id ?? null
  state.getStarted = {
    orgId: next,
    steps: state.getStarted.steps.map((item) =>
      item.step === 'org' ? { step: 'org', complete: next !== null } : item,
    ),
  }
}

/**
 * Leave. The org leaves the list of the user, and Get started follows. The
 * last-admin rule refuses the leave of the last admin with the words of the
 * Worker. A suspended org takes the leave too, as the Worker does.
 */
function leaveOrg(backend: DevBackend, org: OrgState): Response {
  const { state } = backend
  const userId = state.account.user.id
  const otherAdmin = org.members.members.some(
    (member) => member.role === 'admin' && member.user.id !== userId,
  )
  if (org.org.role === 'admin' && !otherAdmin) {
    throw new RouteError(
      409,
      'last_admin',
      'Make another member whose account is not suspended an admin first.',
    )
  }
  state.orgs = state.orgs.filter((item) => item !== org)
  leaveSetupOrg(state, org.org.id)
  return new Response(null, { status: 204 })
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
      method: 'POST',
      path: leaveOrgPath(ID.org),
      answer: ({ params }) => leaveOrg(backend, orgOf(params)),
    },
    {
      method: 'GET',
      path: membersPath(ID.org),
      answer: ({ params }) =>
        json(orgOf(params).members satisfies MembersResponse),
    },
  ]
}
