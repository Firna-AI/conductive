import { githubPaths, type GitHubMergeRequest } from '../../src/shared/github'
import type { OrgRole } from '../../src/shared/api'
import { TEST_ORIGIN, TEST_TIME } from '../test-support/harness'
import { saveGitHubTokens } from '../security/github-tokens'
import { handleGitHubMerge } from './merge-handler'
import { createGitHubHarness, type GitHubTestHarness } from './test-harness'

export async function addMergeMember(
  harness: GitHubTestHarness,
  orgId: string,
  role: OrgRole = 'member',
) {
  harness.base.github.profile = { id: 8, login: 'reviewer' }
  const session = await harness.base.login()
  const userId = await harness.env.DB.prepare(
    'SELECT id FROM users WHERE github_id = 8',
  ).first<string>('id')
  if (!userId) throw new Error('Missing reviewer.')
  await harness.env.DB.prepare(
    'INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
  )
    .bind(orgId, userId, role, TEST_TIME)
    .run()
  await saveGitHubTokens(
    harness.env,
    userId,
    {
      accessToken: 'reviewer-token',
      expiresAt: null,
      refreshToken: null,
      refreshExpiresAt: null,
    },
    TEST_TIME,
  )
  return { session, userId }
}

export async function createMergeHarness() {
  const harness = await createGitHubHarness()
  const jobs = new Map<string, unknown>()
  let sequence = 0
  const request = (path: string, session = '', init: RequestInit = {}) => {
    const headers = new Headers(init.headers)
    headers.set('Cookie', session)
    headers.set('Origin', TEST_ORIGIN)
    headers.set('Content-Type', 'application/json')
    return handleGitHubMerge(
      new Request(`${TEST_ORIGIN}${path}`, { ...init, headers }),
      harness.env,
      {
        now: () => TEST_TIME,
        fetch: (request) => harness.api.fetch(request),
        randomToken: () => `merge-${++sequence}`,
        refresh: harness.refresh,
        publishMerged: (workspace, headSha, authorize) =>
          harness
            .memory(workspace.id)
            .state.merged(authorize, headSha, TEST_TIME),
        scheduleRefresh: (workspace) =>
          harness
            .memory(workspace.id)
            .state.scheduleRefresh({ workspace, signal: {} }, 0),
        storage: {
          get: async (key) => structuredClone(jobs.get(key)),
          put: async (key, value) => {
            jobs.set(key, structuredClone(value))
          },
        },
      },
    )
  }
  return {
    ...harness,
    harness,
    jobs,
    request,
    seed: harness.seed.bind(harness),
    capability: (orgId: string, session: string) =>
      request(githubPaths.capabilities(orgId, 'workspace-1'), session),
    start: (orgId: string, session: string, body: GitHubMergeRequest) =>
      request(githubPaths.merge(orgId, 'workspace-1'), session, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  }
}
