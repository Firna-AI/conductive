import type { MergeQueueRebase } from '../../../shared/generated/MergeQueueRebase'
import { isGitCommitOid } from '../../../shared/git-commit-oid'

export type QueueRebaseTarget = Pick<
  MergeQueueRebase,
  'baseHead' | 'oldBase' | 'label'
> & {
  /** Null is the default branch. An older saved restack can have only a commit. */
  basePullNumber?: number | null
}

function pullRef(number: number) {
  return `refs/pull/${number}/head`
}

function fetchedHead(head: string) {
  return `Check that \`FETCH_HEAD\` is at \`${head}\`. If it is at another commit, stop and say so.`
}

/** The verified rebase and push that queue prompts ask the agent to run. */
export function queueRebaseInstructions(
  input: QueueRebaseTarget,
  stopIfCurrent = false,
): string {
  const { basePullNumber, label } = input
  const head = isGitCommitOid(input.baseHead) ? input.baseHead : undefined
  const old = isGitCommitOid(input.oldBase) ? input.oldBase : undefined
  const ref =
    typeof basePullNumber === 'number'
      ? pullRef(basePullNumber)
      : basePullNumber === null
        ? 'HEAD'
        : (head ?? 'HEAD')
  const base = label
    ? `\`${label.text}\``
    : typeof basePullNumber === 'number'
      ? `pull request #${basePullNumber}`
      : 'the queue base'
  const onto = head ?? 'FETCH_HEAD'
  const verify = head
    ? fetchedHead(head)
    : 'If you cannot verify the fetched base, stop and say so.'
  const current = stopIfCurrent
    ? ` If this branch already builds on \`${onto}\` and has only this layer's own commits after it, say so and stop.`
    : ''
  const rebase = old
    ? `Run \`git rebase --onto ${onto} ${old}\`. Only the commits after the old base move.`
    : `Find the old base where this layer's own commits begin. If you cannot verify it, stop and say so. Rebase with \`git rebase --onto ${onto} <old-base>\`.`
  return `Fetch ${base} with \`git fetch origin ${ref}\`. ${verify}${current} ${rebase} Resolve each conflict, run the tests, then push with \`git push --force-with-lease --force-if-includes\`. If Git refuses the push, stop and report it.`
}

/** Move local-only work onto the rewritten branch on GitHub. */
export function queueSyncInstructions(
  number: number,
  head: string,
  oldHead: string,
): string {
  return `Run \`git fetch origin ${pullRef(number)}\`. ${fetchedHead(head)} Check that \`${oldHead}\` is the base of the local work. If it is not, stop and say so. Run \`git rebase --onto ${head} ${oldHead}\` to move only the local work. Resolve each conflict, run the tests, then run \`git push\`. If Git refuses the push, stop and report it.`
}
