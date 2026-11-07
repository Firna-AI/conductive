import type { User } from '../../src/shared/api'
import { shellQuote } from './commands'

export function defaultBranchCommand(input: {
  directory: string
  defaultBranch: string
  turnId: string
  sender: Pick<User, 'githubId' | 'githubLogin' | 'displayName'>
}): string {
  const name = input.sender.displayName ?? input.sender.githubLogin
  const email = `${input.sender.githubId}+${input.sender.githubLogin}@users.noreply.github.com`
  const identity = [
    `GIT_AUTHOR_NAME=${shellQuote(name)}`,
    `GIT_COMMITTER_NAME=${shellQuote(name)}`,
    `GIT_AUTHOR_EMAIL=${shellQuote(email)}`,
    `GIT_COMMITTER_EMAIL=${shellQuote(email)}`,
  ].join(' ')
  return `set -eu
export CONDUCTING_TURN_ID=${shellQuote(input.turnId)}
cd ${shellQuote(input.directory)}
conducting_remote_refs=$(git ls-remote origin)
if [ -z "$conducting_remote_refs" ]; then
  conducting_empty_tree=$(git mktree </dev/null)
  conducting_initial_commit=$(${identity} git -c commit.gpgsign=false commit-tree "$conducting_empty_tree" -m 'Initialize empty repository')
  if git push origin "$conducting_initial_commit":${shellQuote(`refs/heads/${input.defaultBranch}`)}; then
    :
  else
    conducting_push_status=$?
    conducting_remote_refs=$(git ls-remote origin)
    if [ -z "$conducting_remote_refs" ]; then
      exit "$conducting_push_status"
    fi
  fi
fi
git fetch origin ${shellQuote(input.defaultBranch)}`
}
