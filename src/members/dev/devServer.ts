import { orgPath, type OrgRole } from '../../shared/api'
import {
  invitePath,
  invitesPath,
  memberPath,
  membersPath,
  workspaceOwnerPath,
  type MembersResponse,
  type OrgInvite,
} from '../../shared/members'
import { orgSettingsPaths } from '../../shared/org-settings'
import { deleteOrgPath, restoreOrgPath } from '../../shared/orgs'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_ORIGIN, FAKE_TIME } from '../../test-support/fixtures/core'
import type { FetchLike } from '../api/client'
import { isObject } from '../api/json'
import { computerReplies, type ComputerScene } from './devComputer'
import { devPeople } from './devPeople'
import {
  addFutexRoutes,
  devMembers,
  devOrgIds,
  devWorkspace,
  type DevOrgId,
} from './devOrgs'

/** A change or a load of Acme that the dev page makes fail, to show its error. */
export const devFailures = [
  'invite',
  'role',
  'remove',
  'cancel',
  'reassign',
  'delete',
  'restore',
  'load',
] as const
export type DevFailure = (typeof devFailures)[number]

/** Whether the request is the one that the dev page makes fail. */
function fails(failure: DevFailure, method: string, path: string): boolean {
  const org = 'acme'
  const checks: Readonly<Record<DevFailure, boolean>> = {
    invite: method === 'POST' && path === invitesPath(org),
    role: method === 'PATCH' && path.startsWith(`${membersPath(org)}/`),
    remove: method === 'DELETE' && path.startsWith(`${membersPath(org)}/`),
    cancel: method === 'DELETE' && path.startsWith(`${invitesPath(org)}/`),
    reassign:
      method === 'PUT' &&
      path === workspaceOwnerPath(org, devWorkspace(org).id),
    delete: method === 'POST' && path === deleteOrgPath(org),
    restore: method === 'POST' && path === restoreOrgPath(org),
    load:
      method === 'GET' &&
      [
        membersPath(org),
        orgSettingsPaths.repositories(org),
        orgSettingsPaths.settings(org),
      ].includes(path),
  }
  return checks[failure]
}

function failure(kind: DevFailure): Response {
  if (kind === 'invite') {
    const message = 'The invitation email could not be sent. Try again.'
    return Response.json(
      { error: { code: 'invite_email_failed', message } },
      { status: 502 },
    )
  }
  const message = 'The request failed. Try again.'
  return Response.json(
    { error: { code: 'internal_error', message } },
    { status: 500 },
  )
}

/**
 * The invite that the API answers with for an email. The API keeps one
 * invite for each email of an org, without regard to case, and stores the
 * email in lower case. So the email of an open invite gets that invite.
 */
function inviteFor(invites: readonly OrgInvite[], typed: string): OrgInvite {
  const email = typed.trim().toLowerCase()
  const open = invites.find((invite) => invite.email.toLowerCase() === email)
  return open ?? { id: `invite-${email}`, email, createdAt: FAKE_TIME }
}

/**
 * The fake keeps one reply for each route, and a write does not change it.
 * So before a write reaches the fake, the dev page records the reply that
 * the real API gives for the values that the request sends. A new invite
 * also gets its DELETE reply, so that the person can cancel it.
 */
function replyToWrite(
  server: FakeApiServer,
  org: DevOrgId,
  /** The members and the invites that the dev page shows for the org. */
  data: MembersResponse,
  request: { method: string; path: string; body: unknown },
) {
  const { method, path, body } = request
  if (!isObject(body)) return
  if (method === 'POST' && path === invitesPath(org)) {
    if (typeof body.email !== 'string') return
    const invite = inviteFor(data.invites, body.email)
    server.json('POST', path, { invite }, 201)
    server.empty('DELETE', invitePath(org, invite.id))
  }
  for (const member of data.members) {
    const next = body.role
    if (method === 'PATCH' && path === memberPath(org, member.user.id)) {
      if (next === 'admin' || next === 'member') {
        server.json('PATCH', path, { member: { ...member, role: next } })
      }
    }
    const workspace = devWorkspace(org)
    const ownerPath = workspaceOwnerPath(org, workspace.id)
    if (
      method === 'PUT' &&
      path === ownerPath &&
      body.userId === member.user.id
    ) {
      server.json('PUT', path, {
        workspace: { ...workspace, owner: member.user },
      })
    }
  }
}

/** The org of a request, for the dev page's slow org. */
function orgOf(path: string): DevOrgId | null {
  return devOrgIds.find((org) => path.startsWith(`${orgPath(org)}/`)) ?? null
}

/**
 * A fetch for the dev page: the fake API of Milestone 4a, with Futex added,
 * replies that follow each write, an optional failure of Acme, and an
 * optional delay that shows the busy states. Requests of the `slow` org wait
 * four times as long. It never reaches the network. While a reply waits,
 * `data-dev-pending` on the root element counts it.
 */
export function createDevFetch(options: {
  role: OrgRole
  failure: DevFailure | null
  /** The failure happens only for the first matching request. */
  once: boolean
  delay: number
  slow: DevOrgId | null
  computer: ComputerScene
  /** The number of Acme's members, or 0 for the fixtures. */
  people: number
}): FetchLike {
  const server = new FakeApiServer({ role: options.role })
  for (const reply of computerReplies(options.computer, 'acme')) {
    server.json('GET', reply.path, reply.body)
  }
  addFutexRoutes(server, options.role, options.computer)
  const people = options.people > 0 ? devPeople(options.people) : null
  if (people) {
    server.json('GET', membersPath('acme'), people)
    for (const member of people.members) {
      server.empty('DELETE', memberPath('acme', member.user.id))
    }
  }
  // The writes get their replies from the same members as the reads.
  const membersOf = (org: DevOrgId) =>
    org === 'acme' && people ? people : devMembers(org)
  const delay = options.delay || (options.slow ? 250 : 0)
  let pending = 0
  let failed = 0
  const count = (change: number) => {
    pending += change
    document.documentElement.dataset.devPending = String(pending)
  }
  return async (input, init) => {
    count(1)
    try {
      const request = new Request(new URL(input, FAKE_ORIGIN), init)
      const path = new URL(request.url).pathname
      const org = orgOf(path)
      const wait = org !== null && org === options.slow ? delay * 4 : delay
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
      const matches =
        options.failure !== null && fails(options.failure, request.method, path)
      if (options.failure && matches && !(options.once && failed > 0)) {
        failed += 1
        return failure(options.failure)
      }
      if (request.method !== 'GET' && org !== null) {
        const body: unknown = await request.json().catch(() => null)
        replyToWrite(server, org, membersOf(org), {
          method: request.method,
          path,
          body,
        })
      }
      return await server.fetch(input, init)
    } finally {
      count(-1)
    }
  }
}
