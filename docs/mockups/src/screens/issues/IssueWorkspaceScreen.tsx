import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { ChatPane } from '../../components/chat/ChatPane'
import { AppFrame, MobileFrame } from '../../components/layout/AppFrame'
import { acmeRail } from '../../components/layout/OrgRail'
import { MobileTabBar } from '../../components/workspace/MobileTabBar'
import {
  PullRequestBar,
  PullRequestRow,
} from '../../components/workspace/PullRequestBar'
import type { WorkspaceTab } from '../../components/workspace/TabItem'
import { ToolsPanel } from '../../components/workspace/ToolsPanel'
import { WorkspaceBody } from '../../components/workspace/WorkspaceBody'
import { WorkspaceHeader } from '../../components/workspace/WorkspaceHeader'
import { WorkspaceTabs } from '../../components/workspace/WorkspaceTabs'
import type { ChatItem } from '../../fixtures/conversations'
import type { Workspace } from '../../fixtures/workspaces'
import { composerFor } from '../composerFor'
import { barOf } from '../workspaceBar'
import { FilesContent, ToolContent } from '../workspaceParts'
import { readyWorkspace, type WorkspaceState } from '../workspaceState'
import styles from '../WorkspaceScreen.module.css'

/** The state of the workspace parts that the explorations reuse. */
const baseState: WorkspaceState = {
  ...readyWorkspace,
  banner: 'none',
  files: 'all',
  conversation: 'running',
}

/**
 * A workspace with its issue, for the explorations: the header, the tab
 * row, the chat, the pull request bar, the file lists, and the tools of
 * the workspace screen, with the issue in one place that each variation
 * chooses. `under` lies under the header, as the line of a run workspace.
 * `centre` takes the place of the chat, such as an issue tab. `tools`
 * takes the place of the tools panel, such as an Issue tab beside the
 * terminal. `state` changes the parts of the workspace, such as the pull
 * request bar.
 */
export function IssueWorkspaceScreen(props: {
  viewport: Viewport
  workspace: Workspace
  items: readonly ChatItem[]
  sidebar: ReactNode
  under?: ReactNode
  tabs?: readonly WorkspaceTab[]
  centre?: ReactNode
  tools?: ReactNode
  /** What a phone shows in place of the chat, such as the issue. */
  phone?: ReactNode
  state?: Partial<WorkspaceState>
}) {
  const { viewport, workspace } = props
  const state: WorkspaceState = { ...baseState, ...props.state }
  const bar = barOf(state, { archivable: true, readOnly: false })
  const status = workspace.status
  const chat = (
    <ChatPane
      composer={composerFor(state, workspace, viewport)}
      items={props.items}
      viewer="cal"
      viewport={viewport}
    />
  )
  const header = (
    <>
      <WorkspaceHeader
        canReassign
        canRestart
        name={workspace.name}
        status={status}
        viewport={viewport}
        workspace={workspace}
      />
      {props.under}
    </>
  )
  const tabs = props.tabs ?? [
    {
      key: 'session',
      kind: 'session',
      title: workspace.name,
      selected: true,
      running: true,
    },
  ]
  const tabRow = (
    <WorkspaceTabs
      historyEntries={[]}
      historyOpen={false}
      readOnly={false}
      tabs={tabs}
      viewport={viewport}
    />
  )
  const files = <FilesContent state={state} viewport={viewport} />
  if (viewport === 'mobile') {
    return (
      <MobileFrame>
        {header}
        <PullRequestRow bar={bar} />
        <div className={styles.mobileBody}>
          {props.phone ?? (
            <>
              {tabRow}
              {chat}
            </>
          )}
        </div>
        <MobileTabBar selected="chat" />
      </MobileFrame>
    )
  }
  return (
    <AppFrame rail={acmeRail} sidebar={props.sidebar}>
      <WorkspaceBody
        center={props.centre ?? chat}
        files={files}
        header={header}
        pullRequest={<PullRequestBar bar={bar} workspace={workspace} />}
        tabs={tabRow}
        tools={
          props.tools ?? (
            <ToolsPanel tool={state.tool}>
              <ToolContent state={state} viewport={viewport} />
            </ToolsPanel>
          )
        }
      />
    </AppFrame>
  )
}
