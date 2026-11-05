import type { Viewport } from '@mokly/mokly'
import { ChatPane } from '../components/chat/ChatPane'
import { FilesPanel } from '../components/files/FilesPanel'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { DesktopView } from '../components/tools/DesktopView'
import { PortPreview, PreviewEmpty } from '../components/tools/PortPreview'
import { TerminalView } from '../components/tools/TerminalView'
import { GitHubBanner } from '../components/workspace/GitHubBanner'
import { MobileTabBar } from '../components/workspace/MobileTabBar'
import { SandboxPanel } from '../components/workspace/SandboxNotice'
import { ToolPanel } from '../components/workspace/ToolPanel'
import { WorkspaceHeader } from '../components/workspace/WorkspaceHeader'
import { workspaceGroups } from '../components/workspaces/groups'
import { Sidebar } from '../components/workspaces/Sidebar'
import { conversations, steerDraft } from '../fixtures/conversations'
import { workspaceSession } from '../fixtures/terminal'
import {
  agentNames,
  openableWorkspaceRecords,
  type ActivityStatus,
} from '../fixtures/workspaces'
import type { WorkspaceState } from './workspaceState'
import styles from './WorkspaceScreen.module.css'

const runningConversations = new Set(['running', 'steer', 'first-turn'])

function ToolContent(props: { state: WorkspaceState; viewport: Viewport }) {
  const { state } = props
  if (state.sandbox !== 'ready') {
    return (
      <SandboxPanel
        action={props.viewport === 'mobile'}
        state={state.sandbox}
      />
    )
  }
  switch (state.tool) {
    case 'files':
      return (
        <FilesPanel
          edited={state.workspace === 'checkout-autocomplete'}
          view={state.files}
        />
      )
    case 'terminal':
      return (
        <TerminalView
          extraKeys={props.viewport === 'mobile'}
          lines={workspaceSession}
        />
      )
    case 'preview':
      return state.ports === 'open' ? <PortPreview /> : <PreviewEmpty />
    case 'desktop':
      return <DesktopView />
  }
}

/**
 * An open workspace: its header, the GitHub banner, the chat, and the tools.
 * Desktop shows the chat beside the tool panel; mobile shows one of them
 * with tabs to switch.
 */
export function WorkspaceScreen(props: {
  state: WorkspaceState
  viewport: Viewport
}) {
  const { state, viewport } = props
  const workspace = openableWorkspaceRecords[state.workspace]
  const running =
    state.sandbox === 'ready' && runningConversations.has(state.conversation)
  const status: ActivityStatus =
    state.sandbox === 'ready' ? (running ? 'working' : 'ready') : state.sandbox
  const problem =
    state.sandbox === 'stopped' || state.sandbox === 'error'
      ? state.sandbox
      : undefined
  const chat = (
    <ChatPane
      composer={{
        agent: agentNames[workspace.agent],
        running,
        draft: state.conversation === 'steer' ? steerDraft : '',
      }}
      items={conversations[state.conversation]}
      problem={problem}
      viewport={viewport}
    />
  )
  const tool = <ToolContent state={state} viewport={viewport} />
  const header = (
    <WorkspaceHeader
      status={status}
      viewport={viewport}
      workspace={workspace}
    />
  )
  const banner = (
    <GitHubBanner
      state={state.banner}
      viewport={viewport}
      workspace={workspace}
    />
  )
  if (viewport === 'mobile') {
    return (
      <MobileFrame>
        {header}
        {banner}
        <div className={styles.mobileBody}>
          {state.focus === 'chat' ? chat : tool}
        </div>
        <MobileTabBar selected={state.focus === 'chat' ? 'chat' : state.tool} />
      </MobileFrame>
    )
  }
  const groups = workspaceGroups({ open: { workspace, status } })
  return (
    <AppFrame sidebar={<Sidebar groups={groups} />}>
      {header}
      {banner}
      <div className={styles.body}>
        {chat}
        <ToolPanel tool={state.tool}>{tool}</ToolPanel>
      </div>
    </AppFrame>
  )
}
