import type { Viewport } from '@mokly/mokly'
import { MessageSquarePlus } from 'lucide-react'
import { ChatPane } from '../components/chat/ChatPane'
import { EmptyState } from '../components/common/EmptyState'
import { FilePage } from '../components/files/FilePage'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { MobileTabBar } from '../components/workspace/MobileTabBar'
import {
  PullRequestBar,
  PullRequestRow,
} from '../components/workspace/PullRequestBar'
import { ToolsPanel } from '../components/workspace/ToolsPanel'
import { WorkspaceBody } from '../components/workspace/WorkspaceBody'
import { WorkspaceHeader } from '../components/workspace/WorkspaceHeader'
import { WorkspaceTabs } from '../components/workspace/WorkspaceTabs'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { conversations } from '../fixtures/conversations'
import { orgs } from '../fixtures/orgs'
import {
  openableWorkspaceRecords,
  type ActivityStatus,
} from '../fixtures/workspaces'
import { composerFor, isRunning } from './composerFor'
import {
  FilesContent,
  openFile,
  startingLogFor,
  ToolContent,
} from './workspaceParts'
import type { WorkspaceState } from './workspaceState'
import { tabsFor, workspaceName } from './workspaceTabs'
import styles from './WorkspaceScreen.module.css'

/** The right column in the middle of a drag that widens it, in px. */
const widenedRight = 560

/**
 * An open workspace: its header, its tabs of sessions and files, the pull
 * request, the file lists, and the tools. Desktop shows them side by side; a
 * phone shows one at a time, with tabs to switch.
 */
export function WorkspaceScreen(props: {
  state: WorkspaceState
  viewport: Viewport
}) {
  const { state, viewport } = props
  const record = openableWorkspaceRecords[state.workspace]
  const workspace = { ...record, name: workspaceName(state, record) }
  const status: ActivityStatus =
    state.sandbox === 'ready'
      ? isRunning(state)
        ? 'working'
        : 'ready'
      : state.sandbox
  const problem =
    state.sandbox === 'stopped' || state.sandbox === 'error'
      ? state.sandbox
      : undefined
  const fresh = state.tab === 'new-session'
  const chat = (
    <ChatPane
      composer={composerFor(state, workspace)}
      empty={
        <EmptyState
          body={`The agent works on ${workspace.branch}, on the same cloud computer as the other sessions.`}
          icon={MessageSquarePlus}
          title="New session"
        />
      }
      items={fresh ? [] : conversations[state.conversation]}
      problem={problem}
      starting={startingLogFor(state)}
      viewport={viewport}
    />
  )
  const header = (
    <WorkspaceHeader
      name={workspace.name}
      status={status}
      viewport={viewport}
      workspace={workspace}
    />
  )
  const tabs = tabsFor(state, workspace)
  const files = <FilesContent state={state} viewport={viewport} />
  const tool = <ToolContent state={state} viewport={viewport} />
  if (viewport === 'mobile') {
    const sessions = tabs.filter((tab) => tab.kind === 'session')
    const body = {
      chat: (
        <>
          <WorkspaceTabs tabs={sessions} />
          {chat}
        </>
      ),
      files,
      tool,
    }
    return (
      <MobileFrame>
        {header}
        <PullRequestRow state={state.banner} workspace={workspace} />
        <div className={styles.mobileBody}>{body[state.focus]}</div>
        <MobileTabBar
          selected={state.focus === 'tool' ? state.tool : state.focus}
        />
      </MobileFrame>
    )
  }
  const file = openFile(state)
  const sections = workspaceSections({ workspace, status })
  return (
    <AppFrame sidebar={<Sidebar org={orgs.acme} sections={sections} />}>
      <WorkspaceBody
        center={file ? <FilePage view={file} /> : chat}
        files={files}
        header={header}
        pullRequest={
          <PullRequestBar state={state.banner} workspace={workspace} />
        }
        rightWidth={state.resize === 'right' ? widenedRight : undefined}
        tabs={<WorkspaceTabs tabs={tabs} />}
        tools={<ToolsPanel tool={state.tool}>{tool}</ToolsPanel>}
      />
    </AppFrame>
  )
}
