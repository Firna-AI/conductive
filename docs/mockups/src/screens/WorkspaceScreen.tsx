import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { MessageSquarePlus } from 'lucide-react'
import { ChatPane } from '../components/chat/ChatPane'
import { EmptyState } from '../components/common/EmptyState'
import { FilePage } from '../components/files/FilePage'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import { CommandPalette } from '../components/palette/CommandPalette'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import { MobileTabBar } from '../components/workspace/MobileTabBar'
import {
  PullRequestBar,
  PullRequestRow,
} from '../components/workspace/PullRequestBar'
import { ToolsPanel } from '../components/workspace/ToolsPanel'
import { WorkspaceBody } from '../components/workspace/WorkspaceBody'
import { WorkspaceHeader } from '../components/workspace/WorkspaceHeader'
import { WorkspaceTabs } from '../components/workspace/WorkspaceTabs'
import { conversations } from '../fixtures/conversations'
import { chatItemsFor } from '../fixtures/maskedFiles'
import { memberViewer, people } from '../fixtures/members'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import { suspendedOwner } from '../fixtures/startRefusals'
import { openableWorkspaceRecords } from '../fixtures/workspaces'
import { paths } from '../paths'
import { composerFor } from './composerFor'
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
import { activityOf, drawnState, sandboxNotice } from './workspaceSandbox'
import type { WorkspaceState } from './workspaceState'
import { tabRowOf } from './workspaceTabRow'
import { tabsFor, workspaceName } from './workspaceTabs'
import styles from './WorkspaceScreen.module.css'

/** The right column in the middle of a drag that widens it, in px. */
const widenedRight = 560

/**
 * An open workspace: its header, its tabs of sessions and files, the pull
 * request, the file lists, and the tools. Desktop shows them side by side; a
 * phone shows one at a time, with tabs to switch. In a suspended org the
 * chat history stays, and nothing in the workspace can change: no message,
 * no new session, no rename, no owner change, and no Archive. `overlay`
 * lies over the workspace in place of the overlay of its state, such as a
 * dialog that another screen opens over it.
 */
export function WorkspaceScreen(props: {
  state: WorkspaceState
  viewport: Viewport
  overlay?: ReactNode
}) {
  const { viewport } = props
  const state = drawnState(props.state)
  const suspended = state.org === 'suspended'
  const record = openableWorkspaceRecords[state.workspace]
  // An owner's refused start belongs to a suspended member, whom an active
  // admin sees. A suspended org refuses the start of every owner.
  const ownerRefused = state.sandbox === 'refused' && !suspended
  const owner = ownerRefused ? suspendedOwner : record.owner
  const workspace = { ...record, owner, name: workspaceName(state, record) }
  const status = activityOf(state)
  const archived = state.sandbox === 'archived'
  const readOnly = archived || suspended
  const admin = state.viewer === 'admin'
  const viewer = viewerOf(state)
  // Decision 42: the workspace's owner and the org's admins archive it.
  const archivable = !readOnly && (admin || workspace.owner === viewer)
  const problem = sandboxNotice(state)
  const fresh = state.tab === 'new-session'
  const rightHidden = state.rightColumn === 'hidden'
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
      items={
        fresh
          ? []
          : chatItemsFor(conversations[state.conversation], state.paths)
      }
      notice={
        // An archived workspace keeps its archived bar, so the notice of a
        // suspended org shows above it.
        archived && suspended ? (
          <SuspendedOrgNotice org={orgs[suspendedOrg]} />
        ) : (
          composerNotice(state, workspace)
        )
      }
      problem={problem}
      starting={startingLogFor(state)}
      viewer={viewer}
      viewport={viewport}
    />
  )
  const workspaceHeader = (
    <WorkspaceHeader
      archivable={archivable}
      back={suspended ? paths.suspendedOrg : undefined}
      canReassign={admin && !readOnly}
      name={workspace.name}
      ownerOpen={state.overlay === 'reassign'}
      rightHidden={rightHidden}
      status={status}
      viewport={viewport}
      workspace={workspace}
    />
  )
  // A phone and an archived workspace show only the session tabs.
  const tabs = tabsFor(state, workspace).filter(
    (tab) => tab.kind === 'session' || (!archived && viewport === 'desktop'),
  )
  const row = tabRowOf(state, tabs, viewport, readOnly)
  const overlay =
    props.overlay ??
    workspaceOverlay(state, workspace, viewport, {
      tabs,
      menuTab: row.menuTab,
    })
  const tabRow = (
    <WorkspaceTabs
      drag={row.drag}
      full={row.full}
      historyOpen={state.overlay === 'history'}
      menuTab={row.menuTab}
      readOnly={readOnly}
      renaming={row.renaming}
      tabs={tabs}
      viewport={viewport}
    />
  )
  const { header, files } = placeLostUpdate(state, {
    header: workspaceHeader,
    files: <FilesContent state={state} viewport={viewport} />,
  })
  const tool = <ToolContent state={state} viewport={viewport} />
  if (viewport === 'mobile') {
    if (state.palette !== 'closed') {
      // A phone opens the palette from the list, so it offers no actions
      // of a workspace.
      return (
        <MobileFrame>
          <CommandPalette
            context={{ archivable: false }}
            view={state.palette}
            viewport={viewport}
          />
        </MobileFrame>
      )
    }
    const body = {
      chat: (
        <>
          {tabRow}
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
  const palette =
    state.palette === 'closed' ? null : (
      <CommandPalette
        context={{
          open: { workspace, status },
          archivable,
          rightColumn: !rightHidden,
        }}
        view={state.palette}
        viewport={viewport}
      />
    )
  return (
    <AppFrame
      overlay={palette ?? overlay}
      rail={{
        ...acmeRail,
        suspended: suspended ? suspendedOrg : undefined,
        person: admin ? undefined : people[memberViewer],
      }}
      sidebar={workspaceSidebar(workspace, status, suspended)}
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
        rightHidden={rightHidden}
        rightWidth={state.resize === 'right' ? widenedRight : undefined}
        tabs={tabRow}
        tools={
          archived ? undefined : (
            <ToolsPanel tool={state.tool}>{tool}</ToolsPanel>
          )
        }
      />
    </AppFrame>
  )
}
