import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { ChatWorkspaces } from '../components/chat/chatWorkspaces'
import { FilePage } from '../components/files/FilePage'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import { CommandPalette } from '../components/palette/CommandPalette'
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
import { memberViewer, people } from '../fixtures/members'
import { suspendedOrg } from '../fixtures/orgs'
import { suspendedOwner } from '../fixtures/startRefusals'
import { openableWorkspaceRecords } from '../fixtures/openableWorkspaces'
import { paths } from '../paths'
import { importedScreensOf } from './importedScreens'
import { isImported } from './importedWorkspace'
import { placeLostUpdate } from './lostUpdates'
import { chatWorkspacesOf, createdWorkspaces } from './orgWorkspaces'
import { viewerOf } from './sessionStarter'
import { WorkspaceChat } from './WorkspaceChat'
import {
  FilesContent,
  filePagePlaceholder,
  openFile,
  PhoneFilePage,
  ToolContent,
} from './workspaceParts'
import { workspaceOverlay, workspaceToast } from './workspaceOverlays'
import {
  activityOf,
  archiveRestore,
  drawnState,
  isArchived,
} from './workspaceSandbox'
import { openRowLinks, workspaceSidebar } from './workspaceSidebar'
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
 * The toast of the state lies over everything. A workspace from Conductor
 * lists its old sessions in place of an empty chat, and asks to activate
 * it while it has no cloud computer.
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
  const archived = isArchived(state)
  const readOnly = archived || suspended
  const admin = state.viewer === 'admin'
  const viewer = viewerOf(state)
  const membership = { person: viewer, role: state.viewer }
  // Decision 42: the workspace's owner and the org's admins archive it.
  const archivable =
    !readOnly && mayArchiveWorkspace(membership, workspace.owner)
  // Every member restores it while the app keeps its cloud computer.
  const restorable = archiveRestore(state) === 'available'
  // A workspace from Conductor has no session of its own until a message,
  // and its controls, also Back, the owner, and the org, stay in its own
  // screens.
  const links = isImported(state) ? importedScreensOf(state) : undefined
  const rightHidden = state.rightColumn === 'hidden'
  const rows = chatWorkspacesOf(state, { workspace, status })
  const chat = (
    <WorkspaceChat
      rows={rows}
      state={state}
      viewport={viewport}
      workspace={workspace}
    />
  )
  const workspaceHeader = (
    <WorkspaceHeader
      back={suspended ? paths.suspendedOrg : undefined}
      canReassign={admin && !readOnly}
      copy={state.copyLink === 'none' ? undefined : state.copyLink}
      links={links}
      name={workspace.name}
      ownerOpen={state.overlay === 'reassign'}
      rightHidden={rightHidden}
      status={status}
      viewport={viewport}
      workspace={workspace}
    />
  )
  // A phone and an archived workspace show only the session tabs. The
  // Markdown of an old session stays for the life of its workspace.
  const tabs = tabsFor(state, workspace).filter(
    (tab) =>
      tab.kind === 'session' ||
      (viewport === 'desktop' && (!archived || tab.key === 'old-session')),
  )
  const row = tabRowOf(state, tabs, viewport, readOnly)
  const overlay = (
    <ChatWorkspaces rows={rows}>
      {props.overlay ??
        workspaceOverlay(state, workspace, viewport, {
          tabs,
          menuTab: row.menuTab,
        })}
    </ChatWorkspaces>
  )
  const tabRow = (
    <WorkspaceTabs
      drag={row.drag}
      full={row.full}
      historyEntries={historyFor(state)}
      historyOpen={state.overlay === 'history'}
      links={links}
      menuTab={row.menuTab}
      readOnly={readOnly || state.sandbox === 'inactive'}
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
      chat:
        state.tab === 'old-session' ? (
          <PhoneFilePage state={state} view="old-session" />
        ) : (
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
            links={links}
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
        currentTo: links ? links.list : undefined,
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
        // Only a kept cloud computer comes back. A workspace from Conductor
        // archived before its activation never had one.
        restoreOpen: state.sandbox === 'archived' && state.archive === 'kept',
        row: openRowLinks(state),
      })}
    >
      <WorkspaceBody
        center={
          file ? (
            <FilePage
              placeholder={filePagePlaceholder(state, file)}
              view={file}
            />
          ) : (
            chat
          )
        }
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
            <ToolsPanel links={links} tool={state.tool}>
              {tool}
            </ToolsPanel>
          )
        }
      />
    </AppFrame>
  )
}
