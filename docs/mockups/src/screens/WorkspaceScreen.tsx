import type { Viewport } from '@mokly/mokly'
import { MessageSquarePlus, Plug } from 'lucide-react'
import { ChatPane } from '../components/chat/ChatPane'
import { ActionButton } from '../components/common/actions'
import { EmptyState } from '../components/common/EmptyState'
import { Notice } from '../components/common/Notice'
import { ScreenLink } from '../components/common/ScreenLink'
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
import { agents, type AgentChoice } from '../fixtures/agents'
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
import { paths } from '../paths'
import { workspaceOverlay } from './workspaceOverlays'
import type { WorkspaceState } from './workspaceState'
import { tabsFor, workspaceName } from './workspaceTabs'
import styles from './WorkspaceScreen.module.css'

/** The right column in the middle of a drag that widens it, in px. */
const widenedRight = 560

/**
 * The notice over the composer when the agent of the chosen model is not
 * connected, from decision 33, drawn as its recommended option D.
 */
function connectNotice(state: WorkspaceState, choice: AgentChoice) {
  if (state.composer !== 'no-agent') return undefined
  const agent = agents[choice.agent].name
  return (
    <Notice
      action={
        <ScreenLink asChild to={paths.account}>
          <ActionButton icon={Plug}>{`Connect ${agent}`}</ActionButton>
        </ScreenLink>
      }
      icon={Plug}
      title={`Connect ${agent} to use ${choice.model}`}
    />
  )
}

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
      notice={connectNotice(state, workspace.choice)}
      problem={problem}
      starting={startingLogFor(state)}
      viewport={viewport}
    />
  )
  const header = (
    <WorkspaceHeader
      name={workspace.name}
      ownerOpen={state.overlay === 'reassign'}
      status={status}
      viewport={viewport}
      workspace={workspace}
    />
  )
  const overlay = workspaceOverlay(state, workspace, viewport)
  const historyOpen = state.overlay === 'history'
  const tabs = tabsFor(state, workspace)
  const files = <FilesContent state={state} viewport={viewport} />
  const tool = <ToolContent state={state} viewport={viewport} />
  if (viewport === 'mobile') {
    const sessions = tabs.filter((tab) => tab.kind === 'session')
    const body = {
      chat: (
        <>
          <WorkspaceTabs
            historyOpen={historyOpen}
            tabs={sessions}
            viewport={viewport}
          />
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
        {overlay}
      </MobileFrame>
    )
  }
  const file = openFile(state)
  const sections = workspaceSections({ workspace, status })
  return (
    <AppFrame
      overlay={overlay}
      sidebar={<Sidebar org={orgs.acme} sections={sections} />}
    >
      <WorkspaceBody
        center={file ? <FilePage view={file} /> : chat}
        files={files}
        header={header}
        pullRequest={
          <PullRequestBar state={state.banner} workspace={workspace} />
        }
        rightWidth={state.resize === 'right' ? widenedRight : undefined}
        tabs={
          <WorkspaceTabs
            historyOpen={historyOpen}
            tabs={tabs}
            viewport={viewport}
          />
        }
        tools={<ToolsPanel tool={state.tool}>{tool}</ToolsPanel>}
      />
    </AppFrame>
  )
}
