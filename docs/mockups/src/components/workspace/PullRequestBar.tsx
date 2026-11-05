import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  GitBranch,
  GitPullRequest,
} from 'lucide-react'
import { pullRequest, type BannerState } from '../../fixtures/pullRequests'
import { repositories } from '../../fixtures/repositories'
import type { Workspace } from '../../fixtures/workspaces'
import { checksPaths } from '../../paths'
import { ScreenLink, useOutsideHref } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { prStatus, type PrStatus } from './prStatus'
import styles from './PullRequestBar.module.css'

function compareUrl(workspace: Workspace): string {
  const repository = repositories[workspace.repository]
  return `https://github.com/${repository.name}/compare/${repository.defaultBranch}...${workspace.branch}`
}

/** A link to GitHub. A narrow column keeps only its icon. */
function GitHubLink(props: { href: string; label: string }) {
  const href = useOutsideHref(props.href)
  return (
    <a
      aria-label={props.label}
      className={styles.action}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <span className={styles.actionLabel}>{props.label}</span>
      <ArrowUpRight size={13} />
    </a>
  )
}

function StateLabel(props: { status: PrStatus }) {
  const theme = useSharedUiTheme()
  const Icon = props.status.icon
  return (
    <span className={styles.state}>
      {props.status.busy ? (
        <Spinner color={theme.colors.muted} size={12} />
      ) : null}
      {Icon ? <Icon aria-hidden size={14} /> : null}
      {props.status.text}
    </span>
  )
}

/**
 * The pull request of the workspace branch, at the top of the right column:
 * its number, its checks and merge state, and a link to GitHub. A branch
 * without a pull request shows its target and a link that creates one.
 */
export function PullRequestBar(props: {
  state: BannerState
  workspace: Workspace
}) {
  const { state, workspace } = props
  if (state === 'none') {
    return (
      <div className={styles.bar}>
        <span className={styles.branches}>
          <GitBranch className={styles.muted} size={13} />
          <span className={styles.branch}>{workspace.branch}</span>
          <ArrowRight className={styles.muted} size={12} />
          {repositories[workspace.repository].defaultBranch}
        </span>
        <GitHubLink href={compareUrl(workspace)} label="Create pull request" />
      </div>
    )
  }
  const status = prStatus(state)
  return (
    <div className={classes(styles.bar, styles[status.tone])}>
      <span className={styles.number}>#{pullRequest.number}</span>
      <StateLabel status={status} />
      {status.detail ? (
        <span className={styles.detail}>{status.detail}</span>
      ) : null}
      <span className={styles.spacer} />
      <GitHubLink href={pullRequest.url} label="Open on GitHub" />
    </div>
  )
}

/** The compact pull request row at the top of a workspace on a phone. */
export function PullRequestRow(props: {
  state: BannerState
  workspace: Workspace
}) {
  const { state } = props
  const createHref = useOutsideHref(compareUrl(props.workspace))
  if (state === 'none') {
    return (
      <a
        className={styles.row}
        href={createHref}
        rel="noreferrer"
        target="_blank"
      >
        <GitPullRequest className={styles.muted} size={14} />
        <span className={styles.rowText}>Create pull request</span>
        <ArrowUpRight className={styles.muted} size={14} />
      </a>
    )
  }
  const status = prStatus(state)
  return (
    <ScreenLink
      className={classes(styles.row, styles[status.tone])}
      to={checksPaths[state]}
    >
      <span className={styles.number}>#{pullRequest.number}</span>
      <StateLabel status={status} />
      <span className={styles.spacer} />
      <ChevronRight className={styles.muted} size={15} />
    </ScreenLink>
  )
}
