import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

import { array, string } from './parse.ts'

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (!value) throw new Error(`Set ${name} before the runner starts.`)
  return value
}

export function configuration(env: NodeJS.ProcessEnv) {
  const home = resolve(env.CONDUCTIVE_HOME ?? homedir())
  const secrets: unknown = JSON.parse(env.CONDUCTIVE_OUTPUT_SECRETS ?? '[]')
  return {
    workspaceId: required(env, 'CONDUCTIVE_WORKSPACE_ID'),
    request: {
      url: required(env, 'CONDUCTIVE_RUNNER_URL'),
      workspaceToken: required(env, 'CONDUCTIVE_WORKSPACE_TOKEN'),
    },
    cwd: resolve(required(env, 'CONDUCTIVE_REPOSITORY')),
    home,
    defaultBranch: required(env, 'CONDUCTIVE_DEFAULT_BRANCH'),
    outputSecrets: array(secrets, string),
    statePath:
      env.CONDUCTIVE_STATE_PATH ??
      join(home, '.conductive', 'runner-state.json'),
  }
}
