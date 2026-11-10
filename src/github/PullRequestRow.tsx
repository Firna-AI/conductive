import type { MouseEvent } from 'react'
import {
  ChevronRight,
  CircleAlert,
  GitBranch,
  GitPullRequest,
} from 'lucide-react'
import {
  agentActionLabels,
  barLabels,
} from '../../docs/mockups/src/components/workspace/barCopy'
import { ActionButton } from './ActionButton'
import {
  classes,
  loadFailedText,
  loadingText,
  MutedSpinner,
  StateLabel,
} from './bannerParts'
import { bannerStatus } from './bannerStatus'
import type { BarControls } from './barView'
import type { GitHubFeed } from './githubStore'
import a11y from './a11y.module.css'
import styles from './PullRequestBar.module.css'

export interface PullRequestRowProps {
  github: GitHubFeed
  /** The app address of the Checks tab, because tabs are links. */
  checksHref: string
  /** Lets the app open the Checks tab in place, such as with its router. */
  onOpenChecks?: (event: MouseEvent<HTMLAnchorElement>) => void
  /**
   * The bar actions of the state that shows. The top of the Checks tab
   * holds them, so a branch without a pull request opens that tab when
   * they hold an action or a link.
   */
  controls: BarControls | null
}

/**
 * The compact pull request row at the top of a workspace on a phone. It is
 * one link to the Checks tab, whose top holds the actions of the bar and
 * its links to GitHub. A branch without a commit and without local work is
 * not a link. The row is at least 44 px high.
 */
export function PullRequestRow(props: PullRequestRowProps) {
  const { state, retry } = props.github
  if (state.status === 'loading') {
    return (
      <div className={styles.row}>
        <MutedSpinner size={13} />
        <span className={styles.rowNote}>{loadingText}</span>
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className={styles.row}>
        <CircleAlert aria-hidden className={styles.alert} size={14} />
        <span className={styles.rowText}>{loadFailedText}</span>
        <ActionButton onPress={retry} touch>
          Try again
        </ActionButton>
      </div>
    )
  }
  const { banner, checks } = state.snapshot
  if (banner.pullRequest === null) {
    const view = props.controls?.view
    if (view && (view.actions.length > 0 || view.link !== null)) {
      return (
        <a
          className={styles.row}
          href={props.checksHref}
          onClick={props.onOpenChecks}
        >
          <GitPullRequest aria-hidden className={styles.muted} size={14} />
          <span className={styles.rowText}>
            {agentActionLabels['create-pull-request']}
          </span>
          <ChevronRight aria-hidden className={styles.muted} size={15} />
        </a>
      )
    }
    return (
      <div className={styles.row}>
        <GitBranch aria-hidden className={styles.muted} size={14} />
        <span className={styles.rowText}>
          {banner.state === 'none'
            ? 'No pull request yet'
            : barLabels.noCommits}
        </span>
      </div>
    )
  }
  const status = bannerStatus(banner, checks.checks)
  return (
    <a
      className={classes(styles.row, styles[status.tone])}
      href={props.checksHref}
      onClick={props.onOpenChecks}
    >
      <span className={styles.number}>{`#${banner.pullRequest.number}`}</span>
      <StateLabel status={status} />
      <span className={a11y.hidden}>Show the checks</span>
      <span className={styles.spacer} />
      <ChevronRight aria-hidden className={styles.muted} size={15} />
    </a>
  )
}
