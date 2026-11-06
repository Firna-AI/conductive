import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { ArrowRight, ArrowUpRight, GitBranch } from 'lucide-react'
import type { GitHubBanner } from '../shared/github'
import type { BannerStatus } from './bannerStatus'
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
 * A link to GitHub, which opens in a new tab. A narrow column keeps only its
 * icon, and the link keeps its name.
 */
export function GitHubLink(props: { href: string; label: string }) {
  return (
    <a
      aria-label={props.label}
      className={styles.action}
      href={props.href}
      rel="noreferrer"
      target="_blank"
    >
      <span className={styles.actionLabel}>{props.label}</span>
      <ArrowUpRight aria-hidden size={13} />
    </a>
  )
}

/** The branch and the branch that it merges into. */
export function Branches(props: { banner: GitHubBanner }) {
  return (
    <span className={styles.branches}>
      <GitBranch aria-hidden className={styles.muted} size={13} />
      <span className={styles.branch}>{props.banner.branch}</span>
      <ArrowRight aria-hidden className={styles.muted} size={12} />
      {props.banner.baseBranch}
    </span>
  )
}

/** The words of a state, after a spinner while checks run, or an icon. */
export function StateLabel(props: { status: BannerStatus }) {
  const Icon = props.status.icon
  return (
    <span className={styles.state}>
      {props.status.busy ? <MutedSpinner size={12} /> : null}
      {Icon ? <Icon aria-hidden size={14} /> : null}
      {props.status.text}
    </span>
  )
}
