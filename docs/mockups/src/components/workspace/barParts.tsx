import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { ArrowRight, ArrowUpRight, GitBranch } from 'lucide-react'
import { pullRequest } from '../../fixtures/pullRequests'
import { repositories } from '../../fixtures/repositories'
import type { Workspace } from '../../fixtures/workspaces'
import { GitHubMark } from '../common/GitHubMark'
import { useOutsideHref } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { barLabels } from './barCopy'
import type { GitHubLinkKind } from './barModel'
import type { PrStatus } from './prStatus'
import styles from './PullRequestBar.module.css'

/** The page of GitHub that compares the branch with its target. */
function compareUrl(workspace: Workspace): string {
  const repository = repositories[workspace.repository]
  return `https://github.com/${repository.name}/compare/${repository.defaultBranch}...${workspace.branch}`
}

/**
 * A link to GitHub. When the bar has no room for its words, such as beside
 * an action in a narrow column, the GitHub mark takes the place of the
 * words and the arrow, and the link keeps its name as a tooltip.
 */
export function GitHubLink(props: { href: string; label: string }) {
  const href = useOutsideHref(props.href)
  // The words take the size of the button labels: larger on a phone.
  const control = useControlSizes()
  return (
    <a
      aria-label={props.label}
      className={styles.action}
      href={href}
      rel="noreferrer"
      style={{ fontSize: control.labelSize }}
      target="_blank"
      title={props.label}
    >
      <GitHubMark className={styles.mark} size={13} />
      <span className={styles.actionLabel}>{props.label}</span>
      <ArrowUpRight aria-hidden className={styles.arrow} size={13} />
    </a>
  )
}

/** The link of the bar: the pull request, or the page that creates it. */
export function BarGitHubLink(props: {
  kind: GitHubLinkKind
  workspace: Workspace
}) {
  return props.kind === 'open' ? (
    <GitHubLink href={pullRequest.url} label={barLabels.openOnGitHub} />
  ) : (
    <GitHubLink
      href={compareUrl(props.workspace)}
      label={barLabels.createOnGitHub}
    />
  )
}

/** The branch and the branch that it merges into. */
export function Branches(props: { workspace: Workspace }) {
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

/** The state of a pull request: an icon or a spinner, and its words. */
export function StateLabel(props: { status: PrStatus }) {
  const theme = useSharedUiTheme()
  const Icon = props.status.icon
  return (
    <span className={styles.state}>
      {props.status.busy ? (
        <Spinner color={theme.colors.muted} size={12} />
      ) : null}
      {Icon ? <Icon aria-hidden size={14} /> : null}
      <span className={styles.stateText}>{props.status.text}</span>
    </span>
  )
}
