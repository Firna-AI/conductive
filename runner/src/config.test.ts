import { expect, it, vi } from 'vitest'

import { configuration } from './config'
import { agentInstructions } from './instructions'

it('loads runner settings without a computer server URL', () => {
  const env = {
    CONDUCTIVE_WORKSPACE_ID: 'workspace-1',
    CONDUCTIVE_WORKSPACE_TOKEN: 'workspace-token',
    CONDUCTIVE_RUNNER_URL: 'wss://runner.test/v1/runner',
    CONDUCTIVE_REPOSITORY: '/repo',
    CONDUCTIVE_DEFAULT_BRANCH: 'main',
    CONDUCTIVE_WORKSPACE_BRANCH: 'alice/task',
    CONDUCTIVE_REPOSITORY_ZETA_DIR: '/repos/zeta',
    CONDUCTIVE_REPOSITORY_API_DIR: '/repos/api',
    CONDUCTIVE_REPOSITORY_DIR: '/repo',
    CONDUCTIVE_REPOSITORY_API_TOKEN: 'private-token',
    ORG_SECRET: 'private-secret',
    CONDUCTIVE_HOME: '/private-agent-home',
  }
  expect(() => configuration(env)).not.toThrow()
  expect(configuration(env)).toEqual({
    workspaceId: 'workspace-1',
    request: {
      url: 'wss://runner.test/v1/runner',
      workspaceToken: 'workspace-token',
    },
    cwd: '/repo',
    home: '/private-agent-home',
    defaultBranch: 'main',
    workspaceBranch: 'alice/task',
    repositoryDirectories: {
      CONDUCTIVE_REPOSITORY_API_DIR: '/repos/api',
      CONDUCTIVE_REPOSITORY_ZETA_DIR: '/repos/zeta',
    },
    statePath: '/private-agent-home/.conductive/runner-state.json',
  })
  expect(Object.keys(configuration(env).repositoryDirectories)).toEqual([
    'CONDUCTIVE_REPOSITORY_API_DIR',
    'CONDUCTIVE_REPOSITORY_ZETA_DIR',
  ])
})

it('warns and starts without a workspace branch for an older runner environment', () => {
  const warn = vi.fn()
  const config = configuration(
    {
      CONDUCTIVE_WORKSPACE_ID: 'workspace-1',
      CONDUCTIVE_WORKSPACE_TOKEN: 'workspace-token',
      CONDUCTIVE_RUNNER_URL: 'wss://runner.test/v1/runner',
      CONDUCTIVE_REPOSITORY: '/repo',
      CONDUCTIVE_DEFAULT_BRANCH: 'main',
    },
    warn,
  )
  expect(warn.mock.calls).toEqual([
    ['The workspace branch is unavailable. Agent instructions will omit it.'],
  ])
  expect(config).not.toHaveProperty('workspaceBranch')
  expect(agentInstructions(config).codex).not.toContain('Workspace branch:')
})
