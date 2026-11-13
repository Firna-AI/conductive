import type { AgentCreateWorkspaceRequest } from '../../src/shared/agent-workspaces'
import { TOOL_ENV } from '../../tools/context'
import { record } from '../../tools/input'
import { runToolProcess } from '../../tools/main'
import { OUTER_MACHINE_ORIGIN } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_REPOSITORY,
  OUTER_TOKEN,
  OUTER_WORKSPACE,
  OTHER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { agentWriteFixture } from '../features/agent-session-writes.test-support'
import { RepositoryGitHub } from '../github/fake-repository'
import { saveGitHubTokens } from '../security/github-tokens'
import {
  MCP_INITIALIZE,
  MCP_INITIALIZED,
  mcpRepliesById,
  mcpToolCall,
} from './mcp-test-support'
import { inputLines, toolOutput } from './test-support'
import { completeToolCreation } from './workspace-creation.test-support'

export type BranchAdapter = 'cli' | 'mcp'

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
  const environment = {
    [TOOL_ENV.machineOrigin]: OUTER_MACHINE_ORIGIN,
    [TOOL_ENV.workspaceToken]: OUTER_TOKEN,
    [TOOL_ENV.turnId]: active.sourceTurnId,
  }
  const invoke = async (
    adapter: BranchAdapter,
    branches: Pick<AgentCreateWorkspaceRequest, 'startBranch' | 'baseBranch'>,
    requestId = 'branch-create',
  ) => {
    const input = {
      repositoryId: OUTER_REPOSITORY,
      firstMessage: 'Build from this branch',
      requestId,
      ...branches,
    }
    const output = toolOutput()
    const status = await runToolProcess(
      adapter === 'mcp'
        ? ['mcp']
        : [
            'workspaces',
            'create',
            '--repository',
            input.repositoryId,
            '--message',
            input.firstMessage,
            '--request-id',
            requestId,
            ...Object.entries(branches).flatMap(([key, value]) => [
              key === 'startBranch' ? '--start-branch' : '--base-branch',
              value,
            ]),
          ],
      environment,
      inputLines(
        adapter === 'mcp'
          ? [
              MCP_INITIALIZE,
              MCP_INITIALIZED,
              mcpToolCall('create', 'create_workspace', input),
            ]
          : [],
      ),
      output.output,
      async (request) => {
        const response = await active.runtime.dispatchFetch(request.url, {
          method: request.method,
          headers: [...request.headers],
          body: await request.text(),
        })
        return new Response(await response.text(), {
          status: response.status,
          headers: [...response.headers],
        })
      },
    )
    if (adapter === 'cli')
      return status === 0
        ? {
            ok: true as const,
            value: record(JSON.parse(output.stdout.join(''))),
          }
        : { ok: false as const, message: output.stderr.join('').trim() }
    const result = record(record(mcpRepliesById(output.stdout).create).result)
    return result.isError === false
      ? { ok: true as const, value: record(result.structuredContent) }
      : { ok: false as const, content: result.content }
  }
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
