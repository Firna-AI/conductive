import { API_PATHS, type Org, type User } from '../../src/shared/api'
import type { Workspace } from '../../src/shared/workspaces'
import type { AppDependencies } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import type { InvitationEmail } from '../invitation-mailer'
import {
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { membersGate } from './gate'
import { membersSeed } from './fixture-data.test-support'
import { maintainDisksForTests } from './maintenance-test-support'
import { workspaceCreator } from './ownership'
import { membersRoute, type MembersHooks } from './route'

export function membersClient(harness: TestHarness) {
  let now = TEST_TIME
  let sequence = 0
  const removedWorkspaceState: string[] = []
  const suspendedOrgs: { orgId: string; workspaceIds: readonly string[] }[] = []
  const invitationEmails: InvitationEmail[] = []
  const dependencies: AppDependencies = {
    fetch: harness.boat.fetch,
    now: () => now,
    randomToken: () => `members-${++sequence}`,
    invitationMailer: {
      async send(invitation) {
        invitationEmails.push(invitation)
      },
    },
  }
  const hooks: MembersHooks = {
    maintainDeletedOrg: maintainDisksForTests,
    restoreOrgMaintenance: async () => {},
    readWorkspace: (orgId, id) => readWorkspace(harness, orgId, id),
    suspendOrg: async (orgId, workspaceIds) => {
      suspendedOrgs.push({ orgId, workspaceIds })
    },
    deleteWorkspaceState: async (orgId, id) => {
      removedWorkspaceState.push(`${orgId}/${id}`)
    },
  }
  const request = async (
    path: string,
    session: string,
    init: RequestInit = {},
  ) => {
    const headers = new Headers(init.headers)
    headers.set('Cookie', session)
    headers.set('Origin', TEST_ORIGIN)
    if (init.body) headers.set('Content-Type', 'application/json')
    const request = new Request(`${TEST_ORIGIN}${path}`, { ...init, headers })
    try {
      const context = await membersGate(request, harness.env, now)
      return privateResponse(
        (await membersRoute(
          request,
          harness.env,
          context,
          dependencies,
          hooks,
        )) ?? new Response(null, { status: 404 }),
      )
    } catch (error) {
      return privateResponse(errorResponse(error))
    }
  }
  return {
    request,
    dependencies,
    hooks,
    removedWorkspaceState,
    suspendedOrgs,
    invitationEmails,
    setTime(value: number) {
      now = value
      harness.setTime(value)
    },
  }
}

export async function signIn(
  harness: TestHarness,
  githubId: number,
  login: string,
  emails: readonly { email: string; verified: boolean }[] = [
    { email: `${login.toLowerCase()}@example.com`, verified: true },
  ],
) {
  harness.github.profile = {
    id: githubId,
    login,
    name: login,
    avatar_url: null,
  }
  harness.github.emails = emails
  const session = await harness.login()
  const response = await harness.request(API_PATHS.session, session)
  const value: { user: User } = await response.json()
  return { session, user: value.user }
}

export async function memberFixture(harness: TestHarness) {
  const seed = await membersSeed(harness)
  await harness.env.DB.batch(seed.statements)
  harness.github.profile = seed.profile
  return seed.fixture
}

export async function seedWorkspace(
  harness: TestHarness,
  org: Org,
  owner: User,
  id = 'workspace-one',
) {
  const db = harness.env.DB
  const creator = await workspaceCreator(db, org.id, owner.id)
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO sections (id, org_id, name, position, is_default, created_at)
       VALUES (?, ?, 'General', 0, 1, ?)`,
      )
      .bind(`general-${org.id}`, org.id, TEST_TIME),
    db
      .prepare(
        `INSERT OR IGNORE INTO repositories (id, org_id, github_repository_id, full_name, default_branch)
       VALUES (?, ?, 1, 'example/repository', 'main')`,
      )
      .bind(`repository-${org.id}`, org.id),
    db
      .prepare(
        `INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, section_id,
       name, branch, sandbox_id, state, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'Lisbon', 'member/lisbon-ab12', ?, 'working', ?, ?)`,
      )
      .bind(
        id,
        org.id,
        `repository-${org.id}`,
        creator.id,
        `general-${org.id}`,
        `sandbox-${id}`,
        TEST_TIME,
        TEST_TIME,
      ),
  ])
  return id
}

async function readWorkspace(
  harness: TestHarness,
  orgId: string,
  id: string,
): Promise<Workspace> {
  const row = await harness.env.DB.prepare(
    `SELECT w.id, w.org_id AS orgId, w.repository_id AS repositoryId, w.section_id AS sectionId,
     w.name, w.branch, w.state, w.created_at AS createdAt, w.updated_at AS updatedAt,
     w.archived_at AS archivedAt, u.id AS userId, u.github_login AS githubLogin,
     u.display_name AS displayName, u.avatar_url AS avatarUrl
     FROM workspaces w JOIN users u ON u.id = w.owner_user_id WHERE w.org_id = ? AND w.id = ?`,
  )
    .bind(orgId, id)
    .first<
      Omit<Workspace, 'owner' | 'choice'> & {
        userId: string
        githubLogin: string
        displayName: string | null
        avatarUrl: string | null
      }
    >()
  if (!row)
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  return {
    id: row.id,
    orgId: row.orgId,
    repositoryId: row.repositoryId,
    sectionId: row.sectionId,
    name: row.name,
    branch: row.branch,
    state: row.state,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
    choice: { agent: 'codex', model: 'test-model', effort: 'medium' },
    owner: {
      id: row.userId,
      githubLogin: row.githubLogin,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    },
  }
}

export const write = (body: unknown, method = 'POST'): RequestInit => ({
  method,
  body: JSON.stringify(body),
})

export type MembersClient = ReturnType<typeof membersClient>
