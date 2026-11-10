import type { User } from '../../src/shared/api'
import {
  commitAuthor,
  commitAuthorEnvironment,
} from '../../src/shared/commit-author'
import { shellQuote } from './commands'

export function defaultBranchCommand(input: {
  directory: string
  defaultBranch: string
  turnId: string
  sender: Pick<User, 'githubId' | 'githubLogin' | 'displayName'>
}): string {
  const identity = Object.entries(
    commitAuthorEnvironment(commitAuthor(input.sender)),
  )
    .map(([name, value]) => `${name}=${shellQuote(value)}`)
    .join(' ')
  return `set -eu
export CONDUCTIVE_TURN_ID=${shellQuote(input.turnId)}
cd ${shellQuote(input.directory)}
conductive_remote_refs=$(git ls-remote origin)
if [ -z "$conductive_remote_refs" ]; then
  conductive_empty_tree=$(git mktree </dev/null)
  conductive_initial_commit=$(${identity} git -c commit.gpgsign=false commit-tree "$conductive_empty_tree" -m 'Initialize empty repository')
  if git push origin "$conductive_initial_commit":${shellQuote(`refs/heads/${input.defaultBranch}`)}; then
    :
  else
    conductive_push_status=$?
    conductive_remote_refs=$(git ls-remote origin)
    if [ -z "$conductive_remote_refs" ]; then
      exit "$conductive_push_status"
    fi
  fi
fi
git fetch origin ${shellQuote(input.defaultBranch)}`
}
