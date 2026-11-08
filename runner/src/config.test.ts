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
    CONDUCTIVE_OUTPUT_SECRETS: '["org-private","a","1"]',
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
    outputSecrets: ['org-private', 'a', '1'],
    statePath: '/private-agent-home/.conductive/runner-state.json',
  })
  expect(
    configuration({ ...env, CONDUCTIVE_OUTPUT_SECRETS: undefined })
      .outputSecrets,
  ).toEqual([])
})
