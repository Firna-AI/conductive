import type { Viewport } from '@mokly/mokly'
import { Badge } from '@firna/ui/badge'
import {
  ArrowRight,
  ExternalLink as ExternalIcon,
  GitBranch,
  GitMerge,
  GitPullRequest,
} from 'lucide-react'
import { pullRequest, type BannerState } from '../../fixtures/pullRequests'
import { repositories } from '../../fixtures/repositories'
import type { Workspace } from '../../fixtures/workspaces'
import { centredBadge } from '../common/badgeStyle'
import { ExternalLink } from '../common/ExternalLink'
import { bannerStatus, bannerToneClass } from './bannerContent'
import styles from './GitHubBanner.module.css'

function compareUrl(workspace: Workspace): string {
  const repository = repositories[workspace.repository]
  return `https://github.com/${repository.name}/compare/${repository.defaultBranch}...${workspace.branch}`
}

/** The banner of a branch without a pull request. */
function NoPullRequest(props: { workspace: Workspace; mobile: boolean }) {
  const { workspace } = props
  const href = compareUrl(workspace)
  if (props.mobile) {
    return (
      <a
        className={`${styles.banner} ${styles.mobile}`}
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        <GitPullRequest className={styles.muted} size={16} />
        <span className={`${styles.status} ${styles.primary}`}>
          Create pull request
        </span>
        <ExternalIcon className={styles.primary} size={14} />
      </a>
    )
  }
  return (
    <div className={styles.banner}>
      <div className={styles.pull}>
        <span className={styles.branches}>
          <GitBranch size={14} />
          {workspace.branch}
          <ArrowRight size={13} />
          {repositories[workspace.repository].defaultBranch}
        </span>
      </div>
      <ExternalLink href={href}>Create pull request</ExternalLink>
    </div>
  )
}

/** The pull request, checks, and merge state of the workspace branch. */
export function GitHubBanner(props: {
  state: BannerState
  workspace: Workspace
  viewport: Viewport
}) {
  const { state } = props
  const mobile = props.viewport === 'mobile'
  if (state === 'none') {
    return <NoPullRequest mobile={mobile} workspace={props.workspace} />
  }
  const status = bannerStatus(state)
  const toneClass = bannerToneClass[status.tone]
  const PullIcon = state === 'merged' ? GitMerge : GitPullRequest
  if (mobile) {
    return (
      <a
        className={`${styles.banner} ${styles.mobile}`}
        href={pullRequest.url}
        rel="noreferrer"
        target="_blank"
      >
        <span className={styles.number}>#{pullRequest.number}</span>
        <span className={`${styles.status} ${toneClass}`}>
          {status.icon ?? <PullIcon size={16} />}
          <span className={styles.mobileText}>{status.short}</span>
        </span>
        <ExternalIcon className={styles.muted} size={14} />
      </a>
    )
  }
  return (
    <div className={styles.banner}>
      <div className={styles.pull}>
        <PullIcon className={styles.primary} size={16} />
        <span className={styles.number}>#{pullRequest.number}</span>
        <span className={styles.title}>{pullRequest.title}</span>
      </div>
      <span className={`${styles.status} ${toneClass}`}>
        {status.icon}
        {status.text}
        {status.detail ? (
          <span className={styles.detail}>· {status.detail}</span>
        ) : null}
      </span>
      {status.badge ? (
        <Badge size="sm" style={centredBadge} tone={status.badge.tone}>
          {status.badge.text}
        </Badge>
      ) : null}
      <ExternalLink href={pullRequest.url}>Open on GitHub</ExternalLink>
    </div>
  )
}
