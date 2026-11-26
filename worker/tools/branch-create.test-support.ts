import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { AgentCreateWorkspaceRequest } from '../../src/shared/generated/AgentCreateWorkspaceRequest'
import {
  OUTER_REPOSITORY,
  OUTER_WORKSPACE,
  OTHER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { agentWriteFixture } from '../features/agent-session-writes.test-support'
import { RepositoryGitHub } from '../github/fake-repository'
import { saveGitHubTokens } from '../security/github-tokens'
import { completeToolCreation } from './workspace-creation.test-support'

export async function branchToolFixture(bundle: string) {
  const active = await agentWriteFixture(bundle)
  const github = new RepositoryGitHub(active.github)
  github.repositoryId = 101
  github.fullName = 'owner/repository'
  github.branches.set('refs/heads/develop', 'develop-tip')
  github.branches.set('refs/heads/release/next', 'release-tip')
  github.deniedTokens.add('owner-branch-token')
  const original = active.github.fetch
  active.github.fetch = (request) =>
    new URL(request.url).pathname === '/graphql'
      ? github.fetch(request)
      : original(request)
  for (const id of ['owner', 'member'])
    await saveGitHubTokens(
      active.env,
      id,
      {
        accessToken: `${id}-branch-token`,
        expiresAt: null,
        refreshToken: null,
        refreshExpiresAt: null,
      },
      Date.now(),
    )
  const invoke = (
    branches: Pick<AgentCreateWorkspaceRequest, 'startBranch' | 'baseBranch'>,
    requestId = 'branch-create',
  ) =>
    active.post(MACHINE_PATHS.workspaces, {
      repositoryId: OUTER_REPOSITORY,
      firstMessage: 'Build from this branch',
      requestId,
      ...branches,
    })
  const create = async (...args: Parameters<typeof invoke>) => {
    let settled = false
    const pending = invoke(...args).finally(() => {
      settled = true
    })
    const deadline = Date.now() + 10_000
    while (!settled && Date.now() < deadline) {
      const row = await active.env.DB.prepare(
        'SELECT id FROM workspaces WHERE id NOT IN (?, ?)',
      )
        .bind(OUTER_WORKSPACE, OTHER_WORKSPACE)
        .first<{ id: string }>()
      if (row) {
        await completeToolCreation(active, row.id)
        return pending
      }
    }
    if (!settled)
      throw new Error('The branch create did not settle or reach admission.')
    return pending
  }
  return { ...active, github, invoke, create }
}

export type BranchToolFixture = Awaited<ReturnType<typeof branchToolFixture>>
