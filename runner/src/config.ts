import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (!value) throw new Error(`Set ${name} before the runner starts.`)
  return value
}

export function configuration(
  env: NodeJS.ProcessEnv,
  warn: (message: string) => void = (message) =>
    process.stderr.write(`${message}\n`),
) {
  const home = resolve(env.CONDUCTIVE_HOME ?? homedir())
  const workspaceBranch = env.CONDUCTIVE_WORKSPACE_BRANCH
  if (!workspaceBranch)
    warn(
      'The workspace branch is unavailable. Agent instructions will omit it.',
    )
  return {
    workspaceId: required(env, 'CONDUCTIVE_WORKSPACE_ID'),
    request: {
      url: required(env, 'CONDUCTIVE_RUNNER_URL'),
      workspaceToken: required(env, 'CONDUCTIVE_WORKSPACE_TOKEN'),
    },
    cwd: resolve(required(env, 'CONDUCTIVE_REPOSITORY')),
    home,
    defaultBranch: required(env, 'CONDUCTIVE_DEFAULT_BRANCH'),
    ...(workspaceBranch ? { workspaceBranch } : {}),
    repositoryDirectories: Object.fromEntries(
      Object.keys(env)
        .sort()
        .flatMap((name) => {
          const directory = env[name]
          return /^CONDUCTIVE_REPOSITORY_[A-Z0-9_]+_DIR$/u.test(name) &&
            directory
            ? [[name, resolve(directory)]]
            : []
        }),
    ),
    statePath:
      env.CONDUCTIVE_STATE_PATH ??
      join(home, '.conductive', 'runner-state.json'),
  }
}
