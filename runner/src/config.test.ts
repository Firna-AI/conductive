import { expect, it } from 'vitest'

import { configuration } from './config'

it('loads runner settings without a computer server URL', () => {
  const env = {
    CONDUCTIVE_WORKSPACE_ID: 'workspace-1',
    CONDUCTIVE_WORKSPACE_TOKEN: 'workspace-token',
    CONDUCTIVE_RUNNER_URL: 'wss://runner.test/v1/runner',
    CONDUCTIVE_REPOSITORY: '/repo',
    CONDUCTIVE_DEFAULT_BRANCH: 'main',
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
    statePath: '/private-agent-home/.conductive/runner-state.json',
  })
})
