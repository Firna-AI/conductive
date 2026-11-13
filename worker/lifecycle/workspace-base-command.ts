import { requireGitBranchName } from '../github/branch-name'
import { shellQuote } from './commands'
import { isolatedSourceCommand } from './image-sources/native-command'

const GIT = '/usr/bin/git -c core.hooksPath=/dev/null'

export function workspaceBaseCommand(input: {
  directory: string
  branch: string
  baseBranch: string
}): string {
  requireGitBranchName(input.branch)
  requireGitBranchName(input.baseBranch)
  return isolatedSourceCommand(
    [
      `cd ${shellQuote(input.directory)}`,
      `${GIT} config --local ${shellQuote(`branch.${input.branch}.gh-merge-base`)} ${shellQuote(input.baseBranch)}`,
      `${GIT} symbolic-ref refs/remotes/origin/HEAD ${shellQuote(`refs/remotes/origin/${input.baseBranch}`)}`,
    ].join('\n'),
  )
}
