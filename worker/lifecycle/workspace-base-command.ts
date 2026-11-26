import { requireGitBranchName } from '../github/branch-name'
import { shellQuote } from './commands'
import { isolatedSourceCommand } from './image-sources/native-command'

const GIT = '/usr/bin/git -c core.hooksPath=/dev/null'

export function workspaceBaseCommand(input: {
  directory: string
  branch: string
  baseBranch: string
}): string {
  return isolatedSourceCommand(
    [`cd ${shellQuote(input.directory)}`, ...workspaceBaseSettings(input)].join(
      '\n',
    ),
  )
}

function workspaceBaseSettings(input: {
  branch: string
  baseBranch: string
}): string[] {
  requireGitBranchName(input.branch)
  requireGitBranchName(input.baseBranch)
  const remoteRef = shellQuote(`refs/remotes/origin/${input.baseBranch}`)
  return [
    `if ${GIT} show-ref --verify --quiet ${remoteRef}; then`,
    `  ${GIT} config --local ${shellQuote(`branch.${input.branch}.gh-merge-base`)} ${shellQuote(input.baseBranch)}`,
    `  ${GIT} symbolic-ref refs/remotes/origin/HEAD ${remoteRef}`,
    'fi',
  ]
}
