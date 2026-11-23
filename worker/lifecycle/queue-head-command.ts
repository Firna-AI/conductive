import { isGitCommitOid } from '../../src/shared/git-commit-oid'
import { requireGitBranchName } from '../github/branch-name'
import { BASE_CHANGE_GIT, baseReferenceCommands } from './base-change-commands'
import { shellQuote } from './commands'
import { isolatedSourceCommand } from './image-sources/native-command'

export const HEAD_SYNC_NEEDS_TURN = 42

interface SyncHead {
  directory: string
  branch: string
  oldHead: string
  newHead: string
}

const GIT = `${BASE_CHANGE_GIT} -c core.fsmonitor=false`

function cleanHead({ directory, branch, oldHead, newHead }: SyncHead) {
  requireGitBranchName(branch)
  if (!isGitCommitOid(oldHead) || !isGitCommitOid(newHead))
    throw new Error('Invalid pull request head')
  return [
    `cd ${shellQuote(directory)}`,
    `test "$(${GIT} symbolic-ref --quiet HEAD)" = ${shellQuote(`refs/heads/${branch}`)} || exit ${HEAD_SYNC_NEEDS_TURN}`,
    `local_head=$(${GIT} rev-parse --verify HEAD)`,
    `test "$local_head" = "${oldHead}" || test "$local_head" = "${newHead}" || exit ${HEAD_SYNC_NEEDS_TURN}`,
    `changes=$(${GIT} --no-optional-locks status --porcelain=v1 --untracked-files=all)`,
    `test -z "$changes" || exit ${HEAD_SYNC_NEEDS_TURN}`,
    'for state in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply sequencer; do',
    `  test ! -e "$(${GIT} rev-parse --git-path "$state")" || exit ${HEAD_SYNC_NEEDS_TURN}`,
    'done',
  ]
}

export function queueHeadGuardCommand(input: SyncHead): string {
  return isolatedSourceCommand(cleanHead(input).join('\n'))
}

export function queueHeadCommand(input: SyncHead & { stage: string }): string {
  const { stage, directory, branch, oldHead, newHead } = input
  return isolatedSourceCommand(
    [
      ...cleanHead(input),
      `test "$(${GIT} --git-dir=${shellQuote(stage)} rev-parse --verify refs/heads/continue-base)" = "${newHead}"`,
      ...baseReferenceCommands({
        stage,
        directory,
        baseBranch: branch,
        expectedBranch: branch,
      }),
      `test "$(${GIT} rev-parse --verify HEAD)" = "$local_head" || exit ${HEAD_SYNC_NEEDS_TURN}`,
      `if test "$local_head" = "${oldHead}"; then`,
      `  if sync_error=$(${GIT} checkout --quiet --no-track --no-overwrite-ignore -B ${shellQuote(branch)} "${newHead}" -- 2>&1); then`,
      '    unset sync_error',
      '  else',
      '    case "$sync_error" in',
      `      "error: Your local changes to the following files would be overwritten by checkout:"*|"error: The following untracked working tree files would be overwritten by checkout:"*) exit ${HEAD_SYNC_NEEDS_TURN} ;;`,
      '      *) exit 1 ;;',
      '    esac',
      '  fi',
      'fi',
      `rm -rf -- ${shellQuote(stage)}`,
    ].join('\n'),
  )
}
