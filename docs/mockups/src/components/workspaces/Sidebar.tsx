import { MockLink } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { H5 } from '@firna/ui/typography'
import { FolderGit2, Plus } from 'lucide-react'
import { noop } from '../../noop'
import { paths } from '../../paths'
import type { WorkspaceGroup } from './groups'
import { WorkspaceGroups } from './WorkspaceGroups'
import styles from './Sidebar.module.css'

const fullWidth = { width: '100%' } as const

/** The desktop sidebar: the workspace list and its actions. */
export function Sidebar(props: { groups: readonly WorkspaceGroup[] }) {
  if (props.groups.length === 0) {
    return (
      <div className={styles.top}>
        <H5>Workspaces</H5>
      </div>
    )
  }
  return (
    <>
      <div className={styles.top}>
        <H5>Workspaces</H5>
        <MockLink asChild to={paths.newWorkspace}>
          <Button icon={Plus} onPress={noop} style={fullWidth} tone="primary">
            New workspace
          </Button>
        </MockLink>
      </div>
      <div className={styles.scroll} data-mokly-scroll="workspace-list">
        <WorkspaceGroups groups={props.groups} variant="sidebar" />
      </div>
      <div className={styles.bottom}>
        <MockLink asChild to={paths.addRepository}>
          <Button icon={FolderGit2} onPress={noop} size="sm" tone="plain">
            Add repository
          </Button>
        </MockLink>
      </div>
    </>
  )
}
