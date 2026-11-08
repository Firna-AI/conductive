import type { Viewport } from '@mokly/mokly'
import { MessageSquarePlus } from 'lucide-react'
import { ChatPane } from '../components/chat/ChatPane'
import { isPendingCommand } from '../components/chat/PendingCommand'
import { EmptyState } from '../components/common/EmptyState'
import { FilePage } from '../components/files/FilePage'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import { MobileTabBar } from '../components/workspace/MobileTabBar'
import {
  PullRequestBar,
  PullRequestRow,
} from '../components/workspace/PullRequestBar'
import { ToolsPanel } from '../components/workspace/ToolsPanel'
import { WorkspaceBody } from '../components/workspace/WorkspaceBody'
import { WorkspaceHeader } from '../components/workspace/WorkspaceHeader'
import type { SandboxNoticeState } from '../components/workspace/SandboxNotice'
import { WorkspaceTabs } from '../components/workspace/WorkspaceTabs'
import { conversations } from '../fixtures/conversations'
import { memberViewer, people } from '../fixtures/members'
import { startErrors } from '../fixtures/starting'
import {
  ownerSuspendedRefusal,
  suspendedOwner,
} from '../fixtures/startRefusals'
import {
  openableWorkspaceRecords,
  type ActivityStatus,
} from '../fixtures/workspaces'
import { composerFor, isRunning } from './composerFor'
import { composerNotice } from './composerNotice'
import { placeLostUpdate } from './lostUpdates'
import { viewerOf } from './sessionStarter'
import {
  FilesContent,
  openFile,
  startingLogFor,
  ToolContent,
  workspaceSidebar,
} from './workspaceParts'
import { workspaceOverlay } from './workspaceOverlays'
import type { WorkspaceState } from './workspaceState'
import { tabsFor, workspaceName } from './workspaceTabs'
import styles from './WorkspaceScreen.module.css'

/** The right column in the middle of a drag that widens it, in px. */
const widenedRight = 560

/**
 * The state of the open workspace, for its header and its row: the state
 * of its sandbox, or, on a ready sandbox, whether its agent waits for the
 * user or works.
 */
function activityOf(state: WorkspaceState): ActivityStatus {
  // A refused start leaves the sandbox stopped.
  if (state.sandbox === 'refused') return 'stopped'
  if (state.sandbox !== 'ready') return state.sandbox
  if (conversations[state.conversation].some(isPendingCommand)) return 'input'
  return isRunning(state) ? 'working' : 'ready'
}

/**
 * The bar in place of the composer while the sandbox is not running. A
 * failed start carries the message that the app saved for it.
 */
function sandboxNotice(state: WorkspaceState): SandboxNoticeState | undefined {
  switch (state.sandbox) {
    case 'refused':
      return { problem: 'refused', reason: ownerSuspendedRefusal }
    case 'error':
      return { problem: 'error', message: startErrors[state.startError] }
    case 'stopped':
    case 'archived':
      return { problem: state.sandbox }
    case 'ready':
    case 'starting':
      return undefined
  }
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
  // A refused start belongs to a suspended member, whom an active admin sees.
  const owner = state.sandbox === 'refused' ? suspendedOwner : record.owner
  const workspace = { ...record, owner, name: workspaceName(state, record) }
  const status = activityOf(state)
  const archived = state.sandbox === 'archived'
  const admin = state.viewer === 'admin'
  const viewer = viewerOf(state)
  // Decision 42: the workspace's owner and the org's admins archive it.
  const archivable = !archived && (admin || workspace.owner === viewer)
  const problem = sandboxNotice(state)
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
      notice={composerNotice(state, workspace)}
      problem={problem}
      starting={startingLogFor(state)}
      viewer={viewer}
      viewport={viewport}
    />
  )
  const workspaceHeader = (
    <WorkspaceHeader
      archivable={archivable}
      canReassign={admin && !archived}
      name={workspace.name}
      ownerOpen={state.overlay === 'reassign'}
      status={status}
      viewport={viewport}
      workspace={workspace}
    />
  )
  const overlay = workspaceOverlay(state, workspace, viewport)
  const historyOpen = state.overlay === 'history'
  const tabs = tabsFor(state, workspace).filter(
    (tab) => !archived || tab.kind === 'session',
  )
  const { header, files } = placeLostUpdate(state, {
    header: workspaceHeader,
    files: <FilesContent state={state} viewport={viewport} />,
  })
  const tool = <ToolContent state={state} viewport={viewport} />
  if (viewport === 'mobile') {
    const sessions = tabs.filter((tab) => tab.kind === 'session')
    const body = {
      chat: (
        <>
          <WorkspaceTabs
            historyOpen={historyOpen}
            readOnly={archived}
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
        {archived ? null : (
          <PullRequestRow state={state.banner} workspace={workspace} />
        )}
        <div className={styles.mobileBody}>
          {archived ? body.chat : body[state.focus]}
        </div>
        {archived ? null : (
          <MobileTabBar
            selected={state.focus === 'tool' ? state.tool : state.focus}
          />
        )}
        {overlay}
      </MobileFrame>
    )
  }
  const file = openFile(state)
  return (
    <AppFrame
      overlay={overlay}
      rail={admin ? undefined : { ...acmeRail, person: people[memberViewer] }}
      sidebar={workspaceSidebar(workspace, status)}
    >
      <WorkspaceBody
        center={file ? <FilePage view={file} /> : chat}
        files={files}
        header={header}
        pullRequest={
          <PullRequestBar
            archivable={archivable}
            state={state.banner}
            workspace={workspace}
          />
        }
        rightWidth={state.resize === 'right' ? widenedRight : undefined}
        tabs={
          <WorkspaceTabs
            historyOpen={historyOpen}
            readOnly={archived}
            tabs={tabs}
            viewport={viewport}
          />
        }
        tools={
          archived ? undefined : (
            <ToolsPanel tool={state.tool}>{tool}</ToolsPanel>
          )
        }
      />
    </AppFrame>
  )
}
