import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { MessageSquarePlus } from 'lucide-react'
import { ChatPane } from '../components/chat/ChatPane'
import { ChatWorkspaces } from '../components/chat/chatWorkspaces'
import { EmptyState } from '../components/common/EmptyState'
import { FilePage } from '../components/files/FilePage'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import { CommandPalette } from '../components/palette/CommandPalette'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import { ChecksActions } from '../components/workspace/BarActions'
import { MobileTabBar } from '../components/workspace/MobileTabBar'
import {
  PullRequestBar,
  PullRequestRow,
} from '../components/workspace/PullRequestBar'
import { ToolsPanel } from '../components/workspace/ToolsPanel'
import { WorkspaceBody } from '../components/workspace/WorkspaceBody'
import { WorkspaceHeader } from '../components/workspace/WorkspaceHeader'
import { WorkspaceTabs } from '../components/workspace/WorkspaceTabs'
import { mayArchiveWorkspace } from '../components/workspaces/permissions'
import { chatItemsFor } from '../fixtures/maskedFiles'
import { memberViewer, people } from '../fixtures/members'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import { suspendedOwner } from '../fixtures/startRefusals'
import { paths } from '../paths'
import { composerFor } from './composerFor'
import { composerNotice } from './composerNotice'
import { placeLostUpdate } from './lostUpdates'
import { chatWorkspacesOf, createdWorkspaces } from './orgWorkspaces'
import { viewerOf } from './sessionStarter'
import { barOf, branchOf } from './workspaceBar'
import {
  FilesContent,
  filesPlaceholder,
  openFile,
  startingLogFor,
  ToolContent,
  workspaceSidebar,
} from './workspaceParts'
import {
  transcriptToast,
  workspaceOverlay,
  workspaceToast,
} from './workspaceOverlays'
import { openWorkspace } from './workspaceRun'
import {
  activityOf,
  archiveRestore,
  drawnState,
  sandboxNotice,
} from './workspaceSandbox'
import type { WorkspaceState } from './workspaceState'
import { tabRowOf } from './workspaceTabRow'
import { historyFor, tabsFor, workspaceName } from './workspaceTabs'
import styles from './WorkspaceScreen.module.css'

/** The right column in the middle of a drag that widens it, in px. */
const widenedRight = 560

/**
 * An open workspace: its header, its tabs of sessions and files, the pull
 * request, the file lists, and the tools. Desktop shows them side by side; a
 * phone shows one at a time, with tabs to switch. In a suspended org the
 * chat history stays, and nothing in the workspace can change: no message,
 * no new session, no rename, no owner change, no Archive, and no Restore.
 * `overlay` lies over the workspace in place of the overlay of its state,
 * such as a dialog that another screen opens over it. The chat and the
 * overlay find the workspaces of their chips in the list of the screen.
 * The toast of the state lies over everything.
 */
export function WorkspaceScreen(props: {
  state: WorkspaceState
  viewport: Viewport
  overlay?: ReactNode
}) {
  const { viewport } = props
  const state = drawnState(props.state)
  const suspended = state.org === 'suspended'
  const open = openWorkspace(state)
  const record = open.record
  // An owner's refused start belongs to a suspended member, whom an active
  // admin sees. A suspended org refuses the start of every owner.
  const ownerRefused = state.sandbox === 'refused' && !suspended
  const owner = ownerRefused ? suspendedOwner : record.owner
  const workspace = {
    ...record,
    owner,
    name: workspaceName(state, record),
    branch: branchOf(state, record),
  }
  const status = activityOf(state)
  const archived = state.sandbox === 'archived'
  const readOnly = archived || suspended
  const admin = state.viewer === 'admin'
  const viewer = viewerOf(state)
  const membership = { person: viewer, role: state.viewer }
  // Decision 42: the workspace's owner and the org's admins archive it.
  const archivable =
    !readOnly && mayArchiveWorkspace(membership, workspace.owner)
  // Every member restores it while the app keeps its cloud computer.
  const restorable = archiveRestore(state) === 'available'
  const bar = barOf(state, { archivable, readOnly })
  const problem = sandboxNotice(state)
  const fresh = state.tab === 'new-session'
  const rightHidden = state.rightColumn === 'hidden'
  const rows = chatWorkspacesOf(state, { workspace, status })
  const chat = (
    <ChatWorkspaces rows={rows}>
      <ChatPane
        composer={composerFor(state, workspace)}
        empty={
          <EmptyState
            body={`The agent works on ${workspace.branch}, on the same cloud computer as the other sessions.`}
            icon={MessageSquarePlus}
            title="New session"
          />
        }
        fold={state.fold}
        items={fresh ? [] : chatItemsFor(open.items, state.paths)}
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
    </ChatWorkspaces>
  )
  const workspaceHeader = (
    <WorkspaceHeader
      back={suspended ? paths.suspendedOrg : undefined}
      canReassign={admin && !readOnly}
      copy={state.copyLink === 'none' ? undefined : state.copyLink}
      name={workspace.name}
      ownerOpen={state.overlay === 'reassign'}
      run={open.run}
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
  const overlay = (
    <ChatWorkspaces rows={rows}>
      {props.overlay ??
        workspaceOverlay(state, workspace, viewport, {
          tabs,
          menuTab: row.menuTab,
          readOnly,
        })}
      {transcriptToast(state, viewport)}
    </ChatWorkspaces>
  )
  const tabRow = (
    <WorkspaceTabs
      drag={row.drag}
      full={row.full}
      historyEntries={historyFor(state)}
      historyOpen={state.overlay === 'history'}
      menuTab={row.menuTab}
      readOnly={readOnly}
      renaming={row.renaming}
      tabs={tabs}
      viewport={viewport}
    />
  )
  // A phone shows the actions of the bar at the top of the Checks tab.
  const checksTop =
    viewport === 'mobile' ? (
      <ChecksActions bar={bar} workspace={workspace} />
    ) : undefined
  const { header, files } = placeLostUpdate(state, {
    header: workspaceHeader,
    files: (
      <FilesContent checksTop={checksTop} state={state} viewport={viewport} />
    ),
  })
  const tool = <ToolContent state={state} viewport={viewport} />
  const toast = workspaceToast(state, workspace, viewport)
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
        {archived ? null : <PullRequestRow bar={bar} />}
        <div className={styles.mobileBody}>
          {archived ? body.chat : body[state.focus]}
        </div>
        {archived ? null : (
          <MobileTabBar
            selected={state.focus === 'tool' ? state.tool : state.focus}
          />
        )}
        {overlay}
        {toast}
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
          restorable,
          rightColumn: !rightHidden,
        }}
        view={state.palette}
        viewport={viewport}
      />
    )
  return (
    <AppFrame
      overlay={
        <>
          {palette ?? overlay}
          {toast}
        </>
      }
      rail={{
        ...acmeRail,
        suspended: suspended ? suspendedOrg : undefined,
        person: admin ? undefined : people[memberViewer],
      }}
      sidebar={workspaceSidebar({
        // The toast of an Archive shows at once, so the row shows that Archive.
        workspace:
          state.toast === 'archived'
            ? { ...workspace, updated: 'now' }
            : workspace,
        status,
        suspended,
        viewer: membership,
        created: createdWorkspaces(state),
        restoreOpen: state.archive === 'kept',
      })}
    >
      <WorkspaceBody
        center={
          file ? (
            <FilePage placeholder={filesPlaceholder(state, true)} view={file} />
          ) : (
            chat
          )
        }
        files={files}
        header={header}
        pullRequest={<PullRequestBar bar={bar} workspace={workspace} />}
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
