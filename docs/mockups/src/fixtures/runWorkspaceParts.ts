/**
 * The parts of the workspaces of routine runs. A run workspace is a normal
 * workspace in the section of its routine (decision 504), on a new branch
 * of the owner. Its first message is the prompt, a separator line, and the
 * facts of the trigger. The message copies no title or body of a pull
 * request.
 */

import type { ChatItem } from './conversations'
import type { Routine } from './routines'
import type { StartingLog } from './starting'
import type { Workspace } from './workspaces'

/** The routine of a run, and the pull request of a pull request run. */
type RunOrigin = {
  routine: string
  pullRequest?: { number: number; url: string }
}

export type RunWorkspace = {
  workspace: Workspace
  origin: RunOrigin
  /** The first message, which waits while the sandbox starts. */
  queued: readonly ChatItem[]
  /**
   * The first message and the first turn of the agent: a turn that works,
   * or a turn that failed.
   */
  firstTurn: readonly ChatItem[]
  starting: StartingLog
}

/** The line between the prompt and the facts of the trigger. */
const separator = '---'

/** The first message of a run: the prompt, a separator, and the facts. */
export function runMessage(routine: Routine, facts: readonly string[]): string {
  return [
    routine.prompt,
    '',
    separator,
    `Routine: ${routine.name}`,
    ...facts,
  ].join('\n')
}

/**
 * The facts of a run of a pull request: the trigger, the number and the
 * address of the pull request, its head branch with the head commit, the
 * branch that it merges into, and the branch that the run's work goes to,
 * which is the head branch (decision 507 G).
 */
export function pullRequestFacts(props: {
  trigger: string
  pullRequest: { number: number; url: string }
  head: string
  headCommit: string
  mergesInto: string
}): string[] {
  return [
    `Trigger: ${props.trigger}`,
    `Pull request: #${props.pullRequest.number}, ${props.pullRequest.url}`,
    `Head: ${props.head} at ${props.headCommit}`,
    `Merges into: ${props.mergesInto}`,
    `Your work goes to: ${props.head}`,
  ]
}

/** The steps of the first start of a run workspace on the cloud computer. */
export function cloudStart(fetch: string, branch: string): StartingLog {
  return {
    title: 'Starting the sandbox',
    steps: [
      'Starting from the cloud computer of Acme',
      fetch,
      `Creating branch ${branch}`,
    ],
    elapsed: '7s',
  }
}
