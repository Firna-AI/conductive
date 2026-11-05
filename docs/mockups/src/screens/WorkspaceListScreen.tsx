import type { SchemaProps, Viewport } from '@mokly/mokly'
import { MockLink } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { H3 } from '@firna/ui/typography'
import { FolderGit2, PanelLeft, Plus } from 'lucide-react'
import { EmptyState } from '../components/common/EmptyState'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import responsive from '../components/layout/responsive.module.css'
import {
  workspaceGroups,
  type WorkspaceGroup,
} from '../components/workspaces/groups'
import { Sidebar } from '../components/workspaces/Sidebar'
import { WorkspaceGroups } from '../components/workspaces/WorkspaceGroups'
import { noop } from '../noop'
import { paths } from '../paths'
import styles from './WorkspaceListScreen.module.css'

export const workspaceListSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['list'],
  properties: { list: { enum: ['workspaces', 'first-run'] } },
} as const

export type WorkspaceListState = SchemaProps<typeof workspaceListSchema>

function FirstRun() {
  return (
    <EmptyState
      action={
        <MockLink asChild to={paths.addRepository}>
          <Button icon={Plus} onPress={noop} tone="primary">
            Add repository
          </Button>
        </MockLink>
      }
      body="Each workspace is a sandbox with its own copy of a repository."
      icon={FolderGit2}
      title="Add your first repository"
    />
  )
}

function NewWorkspaceButton(props: { label: string }) {
  return (
    <MockLink asChild to={paths.newWorkspace}>
      <Button icon={Plus} onPress={noop} size="sm" tone="primary">
        {props.label}
      </Button>
    </MockLink>
  )
}

/** The workspace list as a page, with its header and actions. */
function HomeList(props: { groups: readonly WorkspaceGroup[] }) {
  return (
    <>
      <header className={styles.header}>
        <H3>Workspaces</H3>
        <NewWorkspaceButton label="New" />
      </header>
      <div className={styles.scroll}>
        <WorkspaceGroups groups={props.groups} variant="page" />
        <MockLink asChild to={paths.addRepository}>
          <Button icon={FolderGit2} onPress={noop} tone="secondary">
            Add repository
          </Button>
        </MockLink>
      </div>
    </>
  )
}

/**
 * The workspace list. On mobile and in a narrow window it is the home
 * screen. On a wide desktop the list is the sidebar, and the main area waits
 * for a choice.
 */
export function WorkspaceListScreen(props: {
  state: WorkspaceListState
  viewport: Viewport
}) {
  const firstRun = props.state.list === 'first-run'
  const groups = firstRun ? [] : workspaceGroups()
  if (props.viewport === 'mobile') {
    return (
      <MobileFrame>
        {firstRun ? (
          <>
            <header className={styles.header}>
              <H3>Workspaces</H3>
            </header>
            <FirstRun />
          </>
        ) : (
          <HomeList groups={groups} />
        )}
      </MobileFrame>
    )
  }
  return (
    <AppFrame sidebar={<Sidebar groups={groups} />}>
      {firstRun ? (
        <FirstRun />
      ) : (
        <>
          <div className={`${responsive.wideOnly} ${styles.choose}`}>
            <EmptyState
              action={<NewWorkspaceButton label="New workspace" />}
              icon={PanelLeft}
              title="Choose a workspace"
            />
          </div>
          <div className={`${responsive.narrowOnly} ${styles.narrowList}`}>
            <HomeList groups={groups} />
          </div>
        </>
      )}
    </AppFrame>
  )
}
