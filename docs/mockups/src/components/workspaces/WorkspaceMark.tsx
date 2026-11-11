import type { GitHubSummary } from '../../fixtures/pullRequests'
import type { ActivityStatus } from '../../fixtures/workspaces'
import { classes } from '../common/classes'
import { MarkGrid, ring, ringDelay, type MarkCell } from './MarkGrid'
import styles from './WorkspaceMark.module.css'

/** The colour of each GitHub state. */
const colours: Readonly<Record<GitHubSummary, string>> = {
  'checks-failed': styles.checksFailed,
  'checks-running': styles.checksRunning,
  'checks-passed': styles.checksPassed,
  merged: styles.merged,
}

/** The middle column, which stays lit without motion while the agent asks. */
const column: readonly number[] = [1, 4, 7]

/**
 * The colour of the mark: the colour of the GitHub state, or dim grey
 * without one. An archived workspace keeps a faint mark without colour, so
 * that its chip shows the archive.
 */
function toneOf(github: GitHubSummary | null, status: ActivityStatus) {
  if (status === 'archived') return styles.archived
  return github === null ? styles.none : colours[github]
}

/**
 * How one cell looks. While the agent works, a light runs around the ring
 * and the centre stays dim. While the agent needs input, the whole grid
 * pulses. Without motion, the ring or the middle column stays lit. Every
 * other state is still: lit in the colour of the GitHub state, or dim.
 */
function cellOf(
  github: GitHubSummary | null,
  status: ActivityStatus,
  cell: number,
): MarkCell {
  switch (status) {
    case 'working':
      return ring.includes(cell)
        ? {
            className: classes(styles.cell, styles.lit, styles.chase),
            style: ringDelay(cell),
          }
        : { className: styles.cell }
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
    case 'archived':
      return { className: styles.cell }
  }
}

/**
 * The mark of a workspace in the list, the command palette, and chips: the
 * GitHub state of its pull request in one colour, on the grid of
 * `StatusGlyph`. Red is failed checks, amber running checks, green passed
 * checks, and purple a merge. A mark without a GitHub state is dim grey.
 * A still mark means that the agent does not work: a light runs around the
 * ring while it works, and the mark pulses while it needs input. It
 * imports no fixture value, so the app uses it too.
 */
export function WorkspaceMark(props: {
  github: GitHubSummary | null
  status: ActivityStatus
}) {
  const { github, status } = props
  return (
    <MarkGrid
      cell={(cell) => cellOf(github, status, cell)}
      className={classes(styles.mark, toneOf(github, status))}
    />
  )
}
