import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { ArrowRight, ArrowUpRight, GitBranch } from 'lucide-react'
import { GitHubMark } from '../../docs/mockups/src/components/common/GitHubMark'
import { touchControl } from '../../docs/mockups/src/design/metrics'
import type { GitHubBanner } from '../shared/github'
import type { BannerStatus } from './bannerStatus'
import type { CommandKeyOf } from './barKeys'
import styles from './PullRequestBar.module.css'

/** The words of the bar and the row while GitHub has not answered. */
export const loadingText = 'Loading from GitHub'
export const loadFailedText = 'GitHub state did not load'

/** Joins the class names that apply, and skips the others. */
export function classes(...names: (string | false | undefined)[]): string {
  return names
    .filter((name): name is string => typeof name === 'string' && name !== '')
    .join(' ')
}

/** A spinner in the muted colour, as the mockups draw a wait. */
export function MutedSpinner(props: { size: number }) {
  const theme = useSharedUiTheme()
  return <Spinner color={theme.colors.muted} size={props.size} />
}

/**
 * A link to the pull request on GitHub, which opens in a new tab. Beside an
 * action in a narrow column, or in a very narrow one, the GitHub mark takes
 * the place of the words and the arrow, and the link keeps its name as a
 * tooltip, with the key of Open PR on GitHub from `keyOf`. With `touch`,
 * its words take the size of the button labels of a phone.
 */
export function GitHubLink(props: {
  href: string
  label: string
  touch?: boolean
  keyOf?: CommandKeyOf
}) {
  const key = props.keyOf?.('open-pull-request', props.label)
  return (
    <a
      aria-keyshortcuts={key?.aria}
      aria-label={props.label}
      className={styles.action}
      href={props.href}
      rel="noreferrer"
      style={props.touch ? { fontSize: touchControl.labelSize } : undefined}
      target="_blank"
      title={key?.title ?? props.label}
    >
      <GitHubMark className={styles.mark} size={13} />
      <span className={styles.actionLabel}>{props.label}</span>
      <ArrowUpRight aria-hidden className={styles.arrow} size={13} />
    </a>
  )
}

/**
 * The number of the pull request, which opens it on GitHub in a new tab. An
 * arrow after the number marks the link, so the bar needs no other link to
 * the pull request. Its tooltip names the key of Open PR on GitHub from
 * `keyOf`.
 */
export function PullRequestNumber(props: {
  number: number
  href: string
  keyOf?: CommandKeyOf
}) {
  const label = `Open pull request #${props.number} on GitHub`
  const key = props.keyOf?.('open-pull-request', label)
  return (
    <a
      aria-keyshortcuts={key?.aria}
      aria-label={label}
      className={classes(styles.number, styles.numberLink)}
      href={props.href}
      rel="noreferrer"
      target="_blank"
      title={key?.title ?? label}
    >
      <span className={styles.numberText}>{`#${props.number}`}</span>
      <span className={styles.numberArrow}>
        <ArrowUpRight aria-hidden size={12} />
      </span>
    </a>
  )
}

/** The branch and the branch that it merges into. */
export function Branches(props: { banner: GitHubBanner }) {
  return (
    <span className={styles.branches}>
      <GitBranch aria-hidden className={styles.muted} size={13} />
      <span className={styles.branch} title={props.banner.branch}>
        {props.banner.branch}
      </span>
      <ArrowRight aria-hidden className={styles.muted} size={12} />
      <span className={styles.target} title={props.banner.baseBranch}>
        {props.banner.baseBranch}
      </span>
    </span>
  )
}

/**
 * The words of a state, after a spinner while checks run, or an icon. A
 * narrow bar or row cuts the words with an ellipsis, and the page keeps them
 * whole for screen readers and in the tooltip.
 */
export function StateLabel(props: { status: BannerStatus }) {
  const Icon = props.status.icon
  return (
    <span className={styles.state}>
      {props.status.busy ? <MutedSpinner size={12} /> : null}
      {Icon ? <Icon aria-hidden size={14} /> : null}
      <span className={styles.stateText} title={props.status.text}>
        {props.status.text}
      </span>
    </span>
  )
}
