import type { MergeQueueRebase } from '../../../shared/generated/MergeQueueRebase'

/** The verified rebase and push that queue prompts ask the agent to run. */
export function queueRebaseInstructions(
  input: MergeQueueRebase | null,
  stopIfCurrent = false,
): string {
  const ref = input ? `origin/${input.base}` : '<queue-base>'
  const fetch = !input
    ? 'Find the intended branch below this layer in the merge queue and fetch it. If you cannot verify it, stop and say so.'
    : input.baseHead
      ? `Run \`git fetch origin\` and check that \`${ref}\` is at \`${input.baseHead}\`. If it is at another commit, stop and say so.`
      : `Fetch \`${ref}\`.`
  const old = input?.oldBase
  const current =
    stopIfCurrent && input
      ? ` If this branch already builds on \`${ref}\` and has only this layer's own commits after it, say so and stop.`
      : ''
  const rebase = old
    ? `Run \`git rebase --onto ${ref} ${old}\`. Only the commits after the old base move.`
    : `Find the old base where this layer's own commits begin. If you cannot verify it, stop and say so. Rebase with \`git rebase --onto ${ref} <old-base>\`.`
  return `${fetch}${current} ${rebase} Resolve each conflict, run the tests, then push with \`git push --force-with-lease --force-if-includes\`. If Git refuses the push, stop and report it.`
}

/** Move local-only work onto the rewritten branch on GitHub. */
export function queueSyncInstructions(
  branch: string,
  head: string,
  oldHead: string,
): string {
  const ref = `origin/${branch}`
  return `Run \`git fetch origin\` and check that \`${ref}\` is at \`${head}\`. Check that \`${oldHead}\` is the base of the local work. If either check fails, stop and say so. Run \`git rebase --onto ${ref} ${oldHead}\` to move only the local work. Resolve each conflict, run the tests, then run \`git push\`. If Git refuses the push, stop and report it.`
}
