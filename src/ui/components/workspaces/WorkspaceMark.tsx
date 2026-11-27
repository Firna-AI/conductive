import type { GitHubSummary } from '../../../shared/generated/GitHubSummary'
import type { Workspace } from '../../../shared/generated/Workspace'
import type { ActivityStatus } from './activityStatus'
import { classes } from '../common/classes'
import { MarkGrid, ring, ringDelay, type MarkCell } from './MarkGrid'
import styles from './WorkspaceMark.module.css'

/**
 * The colour of each GitHub state: the tone of the pull request bar in the
 * same state.
 */
const colours: Readonly<Record<GitHubSummary, string>> = {
  'checks-running': styles.neutral,
  'checks-failed': styles.danger,
  'ready-to-merge': styles.success,
  merged: styles.merged,
  conflict: styles.warning,
  'changes-requested': styles.warning,
  draft: styles.neutral,
  blocked: styles.warning,
}

/** The middle column, which stays lit without motion while the agent asks. */
const column: readonly number[] = [1, 4, 7]

/**
 * The colour of the mark: the colour of the GitHub state, or dim grey
 * without one. While the agent needs input, the mark is blue whatever the
 * GitHub state, so that a workspace that waits for the user stands out. An
 * archived workspace keeps a faint mark without colour, so that its chip
 * shows the archive.
 */
function toneOf(github: GitHubSummary | null, status: ActivityStatus) {
  if (status === 'archived') return styles.archived
  if (status === 'input') return styles.input
  return github === null ? styles.none : colours[github]
}

/** Every input of the mark of a workspace. */
export type MarkState = {
  /** The GitHub state of its pull request, or `null` without one. */
  github: GitHubSummary | null
  /** The state of its agent and its cloud computer. */
  status: ActivityStatus
  /**
   * Whether a message waits for its cloud computer to start. Without it,
   * the mark of a start stays still.
   */
  messageWaiting?: boolean
}

/**
 * The inputs of the mark of a workspace record. Each place that draws the
 * mark of a record takes them from here, so that it gets every input. A
 * record without a waiting answer gives no `messageWaiting`.
 */
export function markOf(
  workspace: Pick<Workspace, 'github' | 'state' | 'messageWaiting'>,
): MarkState {
  const { github, state, messageWaiting } = workspace
  return {
    github,
    status: state,
    ...(messageWaiting !== undefined && { messageWaiting }),
  }
}

/**
 * Whether the agent is busy for the mark: it works, or a message waits for
 * the cloud computer to start. A start that no message waits on is not.
 */
function busy(status: ActivityStatus, messageWaiting: boolean) {
  return status === 'working' || (status === 'starting' && messageWaiting)
}

/**
 * Whether a light runs around the ring: while the agent is busy, and while
 * the checks run, so that the mark waits on something and the user does
 * not need to act. Needs input keeps its pulse, because the user must act.
 * An archived mark stays still.
 */
function chases(
  github: GitHubSummary | null,
  status: ActivityStatus,
  messageWaiting: boolean,
) {
  if (busy(status, messageWaiting)) return true
  if (status === 'input' || status === 'archived') return false
  return github === 'checks-running'
}

/**
 * How one cell looks. While the agent is busy or the checks run, a light
 * runs around the ring and the centre stays dim. While the agent needs
 * input, the whole grid pulses in blue. Without motion, the ring of a busy
 * agent, or the middle column, stays lit, and running checks light the
 * whole grid. Every other state is still: lit in the colour of the GitHub
 * state, or dim. A start that no message waits on is still too.
 */
function cellOf(
  github: GitHubSummary | null,
  status: ActivityStatus,
  messageWaiting: boolean,
  cell: number,
): MarkCell {
  if (chases(github, status, messageWaiting)) {
    return ring.includes(cell)
      ? {
          className: classes(styles.cell, styles.lit, styles.chase),
          style: ringDelay(cell),
        }
      : {
          className: classes(
            styles.cell,
            !busy(status, messageWaiting) && styles.litWhenStill,
          ),
        }
  }
  switch (status) {
    case 'input':
      return {
        className: classes(
          styles.cell,
          column.includes(cell) && styles.lit,
          styles.pulse,
        ),
      }
    case 'unread':
    case 'ready':
    case 'starting':
    case 'stopped':
    case 'error':
      return { className: classes(styles.cell, github !== null && styles.lit) }
    // `chases` already took the working agent.
    case 'working':
    case 'archived':
      return { className: styles.cell }
  }
}

/**
 * The mark of a workspace in the list, the command palette, and chips: the
 * GitHub state of its pull request in the colour of its pull request bar,
 * on the grid of `StatusGlyph`. Red is failed checks, green ready to merge,
 * purple a merge, and amber a merge conflict, requested changes, or a
 * block. Running checks and a draft are grey. A mark without a GitHub state
 * is dim grey.
 * A light runs around the ring while the agent works, a message waits for
 * the cloud computer to start, or the checks run. `messageWaiting` comes
 * from the Worker, and a mark without it stays still while the cloud
 * computer starts.
 * While the agent needs input, the mark turns blue and pulses, whatever the
 * GitHub state. Every other mark is still. It imports no fixture value, so
 * the app uses it too.
 */
export function WorkspaceMark(props: MarkState) {
  const { github, status } = props
  const messageWaiting = props.messageWaiting === true
  return (
    <MarkGrid
      cell={(cell) => cellOf(github, status, messageWaiting, cell)}
      className={classes(styles.mark, toneOf(github, status))}
    />
  )
}
