import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import {
  Archive,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  GitBranch,
  GitPullRequest,
} from 'lucide-react'
import { pullRequest, type BannerState } from '../../fixtures/pullRequests'
import { repositories } from '../../fixtures/repositories'
import type { Workspace } from '../../fixtures/workspaces'
import { checksPaths, paths } from '../../paths'
import { ActionButton } from '../common/actions'
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

/** The branch and the branch that it merges into. */
function Branches(props: { workspace: Workspace }) {
  const { workspace } = props
  return (
    <span className={styles.branches}>
      <GitBranch className={styles.muted} size={13} />
      <span className={styles.branch}>{workspace.branch}</span>
      <ArrowRight className={styles.muted} size={12} />
      {repositories[workspace.repository].defaultBranch}
    </span>
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
 * without a pull request shows its target and a link that creates one,
 * once the branch has a commit. After the merge, the bar offers Archive,
 * as decision 16 says.
 */
export function PullRequestBar(props: {
  state: BannerState
  workspace: Workspace
  /** The workspace is not archived yet, so a merge offers Archive. */
  archivable: boolean
}) {
  const { state, workspace } = props
  if (state === 'none') {
    return (
      <div className={styles.bar}>
        <Branches workspace={workspace} />
        <GitHubLink href={compareUrl(workspace)} label="Create pull request" />
      </div>
    )
  }
  if (state === 'no-commits') {
    return (
      <div className={styles.bar}>
        <Branches workspace={workspace} />
        <span className={styles.note}>No commits yet</span>
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
      {state === 'merged' && props.archivable ? (
        <ScreenLink asChild to={paths.justArchived}>
          <ActionButton icon={Archive}>Archive</ActionButton>
        </ScreenLink>
      ) : null}
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
  if (state === 'no-commits') {
    return (
      <div className={styles.row}>
        <GitBranch className={styles.muted} size={14} />
        <span className={styles.rowText}>No commits yet</span>
      </div>
    )
  }
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
