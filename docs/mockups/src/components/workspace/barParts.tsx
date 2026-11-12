import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { ArrowRight, ArrowUpRight, GitBranch } from 'lucide-react'
import { pullRequest } from '../../fixtures/pullRequests'
import { baseBranchOf, type Workspace } from '../../fixtures/workspaces'
import { GitHubMark } from '../common/GitHubMark'
import { useOutsideHref } from '../common/ScreenLink'
import { useShortcutTip } from '../common/ShortcutTip'
import { useControlSizes } from '../common/touch'
import { barLabels } from './barCopy'
import type { PrStatus } from './prStatus'
import styles from './PullRequestBar.module.css'

/**
 * A link to the pull request on GitHub. When the bar has no room for its
 * words, such as beside an action in a narrow column, the GitHub mark takes
 * the place of the words and the arrow, and the link keeps its name as a
 * tooltip. On desktop, the tooltip also names the key of Open PR on GitHub.
 */
export function GitHubLink(props: { href: string; label: string }) {
  const href = useOutsideHref(props.href)
  // The words take the size of the button labels: larger on a phone.
  const control = useControlSizes()
  const tip = useShortcutTip(props.label, 'open-pull-request')
  return (
    <a
      aria-label={props.label}
      className={styles.action}
      href={href}
      rel="noreferrer"
      style={{ fontSize: control.labelSize }}
      target="_blank"
      title={tip ?? props.label}
    >
      <GitHubMark className={styles.mark} size={13} />
      <span className={styles.actionLabel}>{props.label}</span>
      <ArrowUpRight aria-hidden className={styles.arrow} size={13} />
    </a>
  )
}

/**
 * The number of the pull request, which opens it on GitHub. An arrow after
 * the number marks the link, so the bar needs no other link to the pull
 * request. On desktop, its tooltip also names the key of Open PR on GitHub.
 */
export function PullRequestNumber(props: { number: number; href: string }) {
  const href = useOutsideHref(props.href)
  const label = `Open pull request #${props.number} on GitHub`
  const tip = useShortcutTip(label, 'open-pull-request')
  return (
    <a
      aria-label={label}
      className={`${styles.number} ${styles.numberLink}`}
      href={href}
      rel="noreferrer"
      target="_blank"
      title={tip ?? label}
    >
      <span className={styles.numberText}>#{props.number}</span>
      <span className={styles.numberArrow}>
        <ArrowUpRight aria-hidden size={12} />
      </span>
    </a>
  )
}

/** The link of the bar to the pull request on GitHub. */
export function BarGitHubLink() {
  return <GitHubLink href={pullRequest.url} label={barLabels.openOnGitHub} />
}

/**
 * The branch and its base branch, which its work goes to. A long base
 * branch, such as the head branch of a pull request, takes at most half of
 * the line, so both names show their start.
 */
export function Branches(props: { workspace: Workspace }) {
  const { workspace } = props
  const base = baseBranchOf(workspace)
  return (
    <span className={styles.branches}>
      <GitBranch className={styles.muted} size={13} />
      <span className={styles.branch}>{workspace.branch}</span>
      <ArrowRight className={styles.muted} size={12} />
      <span className={styles.base} title={base}>
        {base}
      </span>
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
