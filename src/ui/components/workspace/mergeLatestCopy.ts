import {
  queueRebaseInstructions,
  type QueueRebaseTarget,
} from './queueRebaseCopy'

/**
 * The words of Merge latest, the palette action that asks the agent to
 * merge the latest target branch into the workspace branch. It sends its
 * fixed prompt as a message of the member, as an agent action of the pull
 * request bar does. This module imports no fixture, so the app can take
 * the words from here too.
 */

/** The label of the command in the Keyboard shortcuts tab. */
export const mergeLatestCommandLabel = 'Merge latest target branch'

/** More words that a search finds the action by. */
export const mergeLatestWords: readonly string[] = [
  'main',
  'update',
  'sync',
  'pull',
  'rebase',
  'branch',
]

/** The label of the palette row, which names the target branch. */
export function mergeLatestLabel(base: string): string {
  return `Merge latest ${base}`
}

/** The fixed prompt that the palette row sends. */
export function mergeLatestPrompt(base: string): string {
  return `Fetch \`origin/${base}\` and merge it into this branch. If the branch already has every commit of \`origin/${base}\`, say so and stop. Otherwise resolve each conflict, run the tests, then commit and push.`
}

/**
 * The fixed prompt of the palette row while the workspace is in the merge
 * queue. The GitHub stack of the queue needs a linear history, so it asks
 * for a rebase onto the target branch in place of a merge, and a push that
 * replaces only the branch that the agent read.
 */
export function mergeLatestRebasePrompt(input: QueueRebaseTarget): string {
  return `Update this branch for the merge queue's linear history. ${queueRebaseInstructions(input, true)}`
}
