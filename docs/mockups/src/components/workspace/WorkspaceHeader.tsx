import type { Viewport } from '@mokly/mokly'
import { MockLink } from '@mokly/mokly'
import { Badge } from '@firna/ui/badge'
import { Button } from '@firna/ui/button'
import { Caption, H4, Label } from '@firna/ui/typography'
import { ChevronLeft, GitBranch } from 'lucide-react'
import { repositories } from '../../fixtures/repositories'
import type { ActivityStatus, Workspace } from '../../fixtures/workspaces'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { centredBadge } from '../common/badgeStyle'
import { NarrowNav } from '../layout/NarrowNav'
import { activityPresentation } from '../workspaces/status'
import styles from './WorkspaceHeader.module.css'

/** The name, repository, branch, and sandbox state of the open workspace. */
export function WorkspaceHeader(props: {
  workspace: Workspace
  status: ActivityStatus
  viewport: Viewport
}) {
  const { workspace } = props
  const status = activityPresentation[props.status]
  const badge = (
    <Badge
      dot
      pulse={status.pulse}
      size="sm"
      style={centredBadge}
      tone={status.tone}
    >
      {status.label}
    </Badge>
  )
  if (props.viewport === 'mobile') {
    return (
      <header className={`${styles.header} ${styles.mobile}`}>
        <MockLink asChild to={paths.shell}>
          <Button
            accessibilityLabel="All workspaces"
            icon={ChevronLeft}
            onPress={noop}
            shape="square"
            tone="plain"
          />
        </MockLink>
        <div className={styles.titles}>
          <Label numberOfLines={1}>{workspace.name}</Label>
          <span className={styles.branch}>{workspace.branch}</span>
        </div>
        {badge}
      </header>
    )
  }
  return (
    <header className={styles.header}>
      <NarrowNav />
      <div className={styles.titles}>
        <div className={styles.titleRow}>
          <H4 numberOfLines={1}>{workspace.name}</H4>
          {badge}
        </div>
        <div className={styles.meta}>
          <Caption>{repositories[workspace.repository].name}</Caption>
          <GitBranch size={13} />
          <span className={styles.branch}>{workspace.branch}</span>
        </div>
      </div>
    </header>
  )
}
