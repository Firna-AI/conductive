import type { SchemaProps, Viewport } from '@mokly/mokly'
import { MockLink } from '@mokly/mokly'
import { FolderGit2, FolderPlus, PanelLeft, Plus } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { EmptyState } from '../components/common/EmptyState'
import { Mark } from '../components/common/Mark'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import responsive from '../components/layout/responsive.module.css'
import {
  workspaceGroups,
  type WorkspaceGroup,
} from '../components/workspaces/groups'
import { Sidebar } from '../components/workspaces/Sidebar'
import { WorkspaceGroups } from '../components/workspaces/WorkspaceGroups'
import { paths } from '../paths'
import styles from './WorkspaceListScreen.module.css'

export const workspaceListSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['list'],
  properties: {
    list: { enum: ['workspaces', 'first-run'] },
  },
} as const

export type WorkspaceListState = SchemaProps<typeof workspaceListSchema>

function FirstRun() {
  return (
    <EmptyState
      action={
        <MockLink asChild to={paths.addRepository}>
          <ActionButton icon={Plus} tone="primary">
            Add repository
          </ActionButton>
        </MockLink>
      }
      body="Each workspace is a sandbox with its own copy of a repository."
      icon={FolderGit2}
      title="Add your first repository"
    />
  )
}

/** The header of the list page. The mark shows where no rail shows it. */
function ListHeader(props: { action: boolean; mark: boolean }) {
  return (
    <header className={styles.header}>
      {props.mark ? <Mark /> : null}
      <h1 className={styles.title}>Workspaces</h1>
      {props.action ? (
        <MockLink asChild to={paths.newWorkspace}>
          <ActionButton icon={Plus} tone="primary">
            New
          </ActionButton>
        </MockLink>
      ) : null}
    </header>
  )
}

/** The workspace list as a page, with its header and actions. */
function HomeList(props: { groups: readonly WorkspaceGroup[]; mark: boolean }) {
  return (
    <>
      <ListHeader action mark={props.mark} />
      <div className={styles.scroll} data-mokly-scroll="workspace-page">
        <WorkspaceGroups groups={props.groups} variant="page" />
        <MockLink className={styles.add} to={paths.addRepository}>
          <FolderPlus size={15} />
          Add repository
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
            <ListHeader action={false} mark />
            <FirstRun />
          </>
        ) : (
          <HomeList groups={groups} mark />
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
              action={
                <MockLink asChild to={paths.newWorkspace}>
                  <ActionButton icon={Plus} tone="primary">
                    New workspace
                  </ActionButton>
                </MockLink>
              }
              icon={PanelLeft}
              title="Choose a workspace"
            />
          </div>
          <div className={`${responsive.narrowOnly} ${styles.narrowList}`}>
            <HomeList groups={groups} mark={false} />
          </div>
        </>
      )}
    </AppFrame>
  )
}
