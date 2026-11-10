import { CircleAlert } from 'lucide-react'
import type { Timestamp } from '../shared/api'
import { ActionButton } from './ActionButton'
import {
  Branches,
  classes,
  loadFailedText,
  loadingText,
  MutedSpinner,
  StateLabel,
} from './bannerParts'
import { bannerDetail, bannerStatus } from './bannerStatus'
import { BarButtons, BarMessageLine } from './BarButtons'
import type { BarControls } from './barView'
import type { GitHubFeed } from './githubStore'
import styles from './PullRequestBar.module.css'

export interface PullRequestBarProps {
  github: GitHubFeed
  /** The clock of the relative times, such as the time of the merge. */
  now: Timestamp
  /**
   * The actions, the link, and the message of the GitHub state that shows,
   * from the one action state of the screen. Null while no state shows.
   */
  controls: BarControls | null
}

function Pending() {
  return (
    <div className={styles.bar}>
      <span className={styles.pending}>
        <MutedSpinner size={12} />
        {loadingText}
      </span>
    </div>
  )
}

/**
 * The pull request bar at the top of the right column. It shows the GitHub
 * state of the workspace branch, its main action, and a link to GitHub. A
 * branch without a pull request shows its target, Create pull request, and
 * a link that creates the pull request on GitHub once GitHub has a commit.
 * A message, such as a refusal of GitHub, shows under the bar. Beside an
 * action, a narrow bar drops its detail and keeps only the GitHub mark of
 * its link.
 */
export function PullRequestBar(props: PullRequestBarProps) {
  const { state, retry } = props.github
  const { controls } = props
  if (state.status === 'loading') return <Pending />
  if (state.status === 'error') {
    return (
      <div className={styles.bar}>
        <span className={styles.problem}>
          <CircleAlert aria-hidden className={styles.alert} size={14} />
          {loadFailedText}
        </span>
        <span className={styles.spacer} />
        <ActionButton onPress={retry}>Try again</ActionButton>
      </div>
    )
  }
  if (!controls) return <Pending />
  const { banner, checks } = state.snapshot
  const { view } = controls
  const withActions = view.actions.length > 0 && styles.withActions
  const message = view.message ? (
    <BarMessageLine message={view.message} />
  ) : null
  const actions = (
    <span className={styles.actions}>
      <BarButtons controls={controls} />
    </span>
  )
  if (banner.pullRequest === null) {
    return (
      <>
        <div className={classes(styles.bar, withActions)}>
          <Branches banner={banner} />
          {view.note ? (
            <span className={styles.note}>{view.note}</span>
          ) : (
            actions
          )}
        </div>
        {message}
      </>
    )
  }
  const status = bannerStatus(banner, checks.checks)
  const detail = bannerDetail(banner, checks.checks, props.now)
  return (
    <>
      <div className={classes(styles.bar, styles[status.tone], withActions)}>
        <span className={styles.number}>{`#${banner.pullRequest.number}`}</span>
        <StateLabel status={status} />
        {detail ? (
          <span className={styles.detail} title={detail}>
            {detail}
          </span>
        ) : null}
        {actions}
      </div>
      {message}
    </>
  )
}
