import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (!value) throw new Error(`Set ${name} before the runner starts.`)
  return value
}

export function configuration(env: NodeJS.ProcessEnv) {
  const home = resolve(env.CONDUCTING_HOME ?? homedir())
  const computerMcpUrl = required(env, 'CONDUCTING_COMPUTER_MCP_URL')
  new URL(computerMcpUrl)
  return {
    workspaceId: required(env, 'CONDUCTING_WORKSPACE_ID'),
    request: {
      url: required(env, 'CONDUCTING_RUNNER_URL'),
      workspaceToken: required(env, 'CONDUCTING_WORKSPACE_TOKEN'),
    },
    cwd: resolve(required(env, 'CONDUCTING_REPOSITORY')),
    home,
    defaultBranch: required(env, 'CONDUCTING_DEFAULT_BRANCH'),
    computerMcpUrl,
    statePath:
      env.CONDUCTING_STATE_PATH ??
      join(home, '.conducting', 'runner-state.json'),
  }
}
