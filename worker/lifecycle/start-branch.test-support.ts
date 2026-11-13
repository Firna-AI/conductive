import type { CreateWorkspaceRequest } from '../../src/shared/workspaces'
import { workspacesPath } from '../../src/shared/workspaces'
import { RepositoryGitHub } from '../github/fake-repository'
import { saveGitHubTokens } from '../security/github-tokens'
import { TEST_TIME } from '../test-support/harness'
import type { backendFixture } from './backend-test-support'
import { SOFTWARE } from './backend-test-support'
import { handleLifecycleRequest } from './browser'
import { FIRST_MESSAGE } from './durable-test-support'

type Backend = Awaited<ReturnType<typeof backendFixture>>

export async function branchGitHub(fixture: Backend) {
  const api = new RepositoryGitHub(fixture.harness.github)
  api.fullName = 'example/repository'
  api.repositoryId = 1
  api.branches.set('refs/heads/develop', 'develop-tip')
  api.branches.set('refs/heads/release/next', 'release-tip')
  const original = fixture.runtime.dependencies.fetch
  fixture.runtime.dependencies.fetch = (request) =>
    new URL(request.url).pathname === '/graphql'
      ? api.fetch(request)
      : original(request)
  await saveGitHubTokens(
    fixture.runtime.env,
    fixture.user.id,
    {
      accessToken: 'create-sender-token',
      expiresAt: null,
      refreshToken: null,
      refreshExpiresAt: null,
    },
    TEST_TIME,
  )
  return api
}

export function browserBranchCreate(
  fixture: Backend,
  branches: Pick<CreateWorkspaceRequest, 'startBranch' | 'baseBranch'>,
) {
  const body = {
    repositoryId: fixture.repositoryId,
    firstMessage: FIRST_MESSAGE,
    ...branches,
  }
  return fixture.run(() =>
    handleLifecycleRequest(
      new Request(
        `${fixture.runtime.env.APP_ORIGIN}${workspacesPath(fixture.org.id)}`,
        { method: 'POST' },
      ),
      { user: fixture.user, org: fixture.org, sessionId: 'signed-in', body },
      { ...fixture.runtime, images: fixture.images },
      {
        software: SOFTWARE,
        acceptFirstMessage: async (first) => ({
          id: first.request.id,
          sessionId: first.sessionId,
          sender: first.sender,
          text: first.request.text,
          attachments: [],
          choice: first.request.choice,
          createdAt: TEST_TIME,
          state: 'queued',
        }),
        waitUntil: () => {},
      },
    ),
  )
}
