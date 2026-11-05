import type { Viewport } from '@mokly/mokly'
import { ChatPane } from '../components/chat/ChatPane'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { MobileTabBar } from '../components/workspace/MobileTabBar'
import {
  PullRequestBar,
  PullRequestRow,
} from '../components/workspace/PullRequestBar'
import { ToolsPanel } from '../components/workspace/ToolsPanel'
import { WorkspaceBody } from '../components/workspace/WorkspaceBody'
import { WorkspaceHeader } from '../components/workspace/WorkspaceHeader'
import { workspaceGroups } from '../components/workspaces/groups'
import { Sidebar } from '../components/workspaces/Sidebar'
import { conversations, steerDraft } from '../fixtures/conversations'
import {
  agentNames,
  openableWorkspaceRecords,
  type ActivityStatus,
} from '../fixtures/workspaces'
import { FilesContent, startingLogFor, ToolContent } from './workspaceParts'
import type { WorkspaceState } from './workspaceState'
import styles from './WorkspaceScreen.module.css'

const runningConversations = new Set(['running', 'steer', 'first-turn'])

/**
 * An open workspace: its header, the pull request, the chat, the files, and
 * the tools. Desktop shows them side by side; a phone shows one at a time,
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
      starting={startingLogFor(state)}
      viewport={viewport}
    />
  )
  const files = <FilesContent state={state} viewport={viewport} />
  const tool = <ToolContent state={state} viewport={viewport} />
  if (viewport === 'mobile') {
    const body = { chat, files, tool }
    return (
      <MobileFrame>
        <WorkspaceHeader
          status={status}
          viewport={viewport}
          workspace={workspace}
        />
        <PullRequestRow state={state.banner} workspace={workspace} />
        <div className={styles.mobileBody}>{body[state.focus]}</div>
        <MobileTabBar
          selected={state.focus === 'tool' ? state.tool : state.focus}
        />
      </MobileFrame>
    )
  }
  const groups = workspaceGroups({ open: { workspace, status } })
  return (
    <AppFrame sidebar={<Sidebar groups={groups} />}>
      <WorkspaceBody
        chat={chat}
        files={files}
        header={
          <WorkspaceHeader
            status={status}
            viewport={viewport}
            workspace={workspace}
          />
        }
        pullRequest={
          <PullRequestBar state={state.banner} workspace={workspace} />
        }
        tools={<ToolsPanel tool={state.tool}>{tool}</ToolsPanel>}
      />
    </AppFrame>
  )
}
