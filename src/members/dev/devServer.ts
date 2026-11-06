import { orgPath, type OrgRole } from '../../shared/api'
import {
  invitePath,
  invitesPath,
  memberPath,
  membersPath,
  workspaceOwnerPath,
} from '../../shared/members'
import { orgSettingsPaths } from '../../shared/org-settings'
import { deleteOrgPath, restoreOrgPath } from '../../shared/orgs'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_ORIGIN, FAKE_TIME } from '../../test-support/fixtures/core'
import type { FetchLike } from '../api/client'
import { isObject } from '../api/json'
import { computerReplies, type ComputerScene } from './devComputer'
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
    const message =
      'No GitHub account has this login. Check the login, then try again.'
    return Response.json(
      { error: { code: 'github_user_missing', message } },
      { status: 404 },
    )
  }
  const message = 'The request failed. Try again.'
  return Response.json(
    { error: { code: 'internal_error', message } },
    { status: 500 },
  )
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
  request: { method: string; path: string; body: unknown },
) {
  const { method, path, body } = request
  if (!isObject(body)) return
  if (method === 'POST' && path === invitesPath(org)) {
    if (typeof body.githubLogin !== 'string') return
    const login = body.githubLogin
    const invite = {
      id: `invite-${login}`,
      githubLogin: login,
      createdAt: FAKE_TIME,
    }
    server.json('POST', path, { invite }, 201)
    server.empty('DELETE', invitePath(org, invite.id))
  }
  for (const member of devMembers(org).members) {
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
  delay: number
  slow: DevOrgId | null
  computer: ComputerScene
}): FetchLike {
  const server = new FakeApiServer({ role: options.role })
  for (const reply of computerReplies(options.computer, 'acme')) {
    server.json('GET', reply.path, reply.body)
  }
  addFutexRoutes(server, options.role, options.computer)
  const delay = options.delay || (options.slow ? 250 : 0)
  let pending = 0
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
      if (options.failure && fails(options.failure, request.method, path)) {
        return failure(options.failure)
      }
      if (request.method !== 'GET' && org !== null) {
        const body: unknown = await request.json().catch(() => null)
        replyToWrite(server, org, { method: request.method, path, body })
      }
      return await server.fetch(input, init)
    } finally {
      count(-1)
    }
  }
}
