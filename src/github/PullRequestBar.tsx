import { Archive, CircleAlert } from 'lucide-react'
import type { Timestamp } from '../shared/api'
import type { Workspace } from '../shared/workspaces'
import { ActionButton, type CommandKey } from './ActionButton'
import { canArchive, type GitHubViewer } from './archive'
import {
  Branches,
  classes,
  GitHubLink,
  loadFailedText,
  loadingText,
  MutedSpinner,
  StateLabel,
} from './bannerParts'
import { bannerDetail, bannerStatus } from './bannerStatus'
import type { GitHubFeed } from './githubStore'
import styles from './PullRequestBar.module.css'

export interface PullRequestBarProps {
  github: GitHubFeed
  /** The clock of the relative times, such as the time of the merge. */
  now: Timestamp
  /** The owner and the state of the workspace decide whether Archive shows. */
  workspace: Pick<Workspace, 'owner' | 'state'>
  viewer: GitHubViewer
  /**
   * Opens the app's Archive flow, with its check for unpushed work, or null
   * when the app offers no Archive, as in a suspended org.
   */
  onArchive: (() => void) | null
  /** The key of the command of Archive, which its tooltip shows. */
  archiveKey?: CommandKey
}

/**
 * The pull request bar at the top of the right column. It shows the GitHub
 * state of the workspace branch, and links to GitHub. A branch without a
 * pull request shows its target, and a link that creates the pull request
 * once the branch has a commit. After the merge, the workspace owner and the
 * admins see Archive, as decisions 16 and 42 say.
 */
export function PullRequestBar(props: PullRequestBarProps) {
  const { state, retry } = props.github
  if (state.status === 'loading') {
    return (
      <div className={styles.bar}>
        <span className={styles.pending}>
          <MutedSpinner size={12} />
          {loadingText}
        </span>
      </div>
    )
  }
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
  const { banner, checks } = state.snapshot
  if (banner.pullRequest === null) {
    const createUrl =
      banner.state === 'none' ? banner.createPullRequestUrl : null
    return (
      <div className={styles.bar}>
        <Branches banner={banner} />
        {createUrl ? (
          <GitHubLink href={createUrl} label="Create pull request" />
        ) : (
          <span className={styles.note}>
            {banner.state === 'none' ? 'No pull request yet' : 'No commits yet'}
          </span>
        )}
      </div>
    )
  }
  const status = bannerStatus(banner, checks.checks)
  const detail = bannerDetail(banner, checks.checks, props.now)
  const { onArchive } = props
  const archive =
    banner.state === 'merged' && canArchive(props.workspace, props.viewer)
      ? onArchive
      : null
  return (
    <div className={classes(styles.bar, styles[status.tone])}>
      <span className={styles.number}>{`#${banner.pullRequest.number}`}</span>
      <StateLabel status={status} />
      {detail ? (
        <span className={styles.detail} title={detail}>
          {detail}
        </span>
      ) : null}
      <span className={styles.actions}>
        {archive ? (
          <ActionButton
            commandKey={props.archiveKey}
            icon={Archive}
            onPress={archive}
          >
            Archive
          </ActionButton>
        ) : null}
        <GitHubLink href={banner.pullRequest.url} label="Open on GitHub" />
      </span>
    </div>
  )
}
