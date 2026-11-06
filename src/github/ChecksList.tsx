import { CircleAlert, ListChecks } from 'lucide-react'
import type { GitHubCheck } from '../shared/github'
import { MutedSpinner } from './bannerParts'
import { reviewLabel, type PullRequestBanner } from './bannerStatus'
import { checkLooks, isFailedCheck, type CheckLook } from './checkStatus'
import { EmptyState } from './EmptyState'
import { countOf, formatDuration } from './format'
import type { GitHubFeed } from './githubStore'
import a11y from './a11y.module.css'
import styles from './ChecksList.module.css'

export interface ChecksListProps {
  github: GitHubFeed
}

function summary(
  banner: PullRequestBanner,
  checks: readonly GitHubCheck[],
): string {
  const failed = checks.filter(isFailedCheck).length
  let count = 'No checks'
  if (failed > 0) count = `${failed} of ${checks.length} failed`
  else if (checks.length > 0) count = countOf(checks.length, 'check')
  const review = reviewLabel(banner.review)
  return review ? `${count} · ${review}` : count
}

function CheckIcon(props: { look: CheckLook }) {
  const Icon = props.look.icon
  if (!Icon) return <MutedSpinner size={12} />
  return <Icon aria-hidden className={styles[props.look.tone]} size={14} />
}

/** A finished check shows how long it ran, and the others their state. */
function CheckRow(props: { check: GitHubCheck }) {
  const { check } = props
  const look = checkLooks[check.state]
  const duration =
    look.finished && check.durationMs !== null
      ? formatDuration(check.durationMs)
      : null
  return (
    <li className={styles.row}>
      <CheckIcon look={look} />
      <span className={styles.name}>{check.name}</span>
      {duration ? <span className={a11y.hidden}>{look.label}</span> : null}
      <span className={styles.state}>{duration ?? look.label}</span>
    </li>
  )
}

/**
 * The Checks tab: each check that GitHub reports for the pull request, in
 * GitHub's order, under the title of the pull request. While the branch has
 * no pull request, the tab waits for one. A failed load names its error here,
 * and the bar or the row above holds the one Try again of the screen.
 */
export function ChecksList(props: ChecksListProps) {
  const { state } = props.github
  if (state.status === 'loading') {
    return (
      <div className={styles.waiting}>
        <MutedSpinner size={13} />
        Loading checks
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <EmptyState
        body={state.message ?? undefined}
        icon={CircleAlert}
        title="Checks did not load"
      />
    )
  }
  const { banner, checks } = state.snapshot
  if (
    banner.pullRequest === null ||
    checks.state === 'waiting-for-pull-request'
  ) {
    return (
      <EmptyState
        body="They appear when the branch has a pull request."
        icon={ListChecks}
        title="GitHub checks show here"
      />
    )
  }
  return (
    <div className={styles.scroll}>
      <div className={styles.head}>
        <span className={styles.title}>{banner.pullRequest.title}</span>
        <span className={styles.summary}>{summary(banner, checks.checks)}</span>
      </div>
      {checks.checks.length > 0 ? (
        <ul aria-label="Checks" className={styles.list}>
          {checks.checks.map((check) => (
            <CheckRow check={check} key={check.id} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}
