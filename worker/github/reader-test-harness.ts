import { FakeGitHub } from '../test-support/fake-github'
import { TEST_TIME } from '../test-support/harness'
import { GitHubReader } from './client'
import type { GitHubWorkspace } from './contracts'
import { RepositoryGitHub } from './fake-repository'

const workspace: GitHubWorkspace = {
  id: 'workspace-1',
  orgId: 'org-1',
  branch: 'changes',
  repositoryId: 186853002,
  fullName: 'Codertocat/Hello-World',
  defaultBranch: 'main',
  installationId: 1,
}

export function createReaderHarness() {
  const api = new RepositoryGitHub(new FakeGitHub())
  const read = () =>
    new GitHubReader(
      {
        fetch: (request) => api.fetch(request),
        now: () => TEST_TIME,
        token: async () => 'server-read-token',
      },
      workspace,
      'server-read-token',
    ).read()
  return { api, read }
}
