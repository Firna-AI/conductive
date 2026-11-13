import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { ChatPane } from '../components/chat/ChatPane'
import { ChatWorkspaces } from '../components/chat/chatWorkspaces'
import { FilePage } from '../components/files/FilePage'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import { useMacApp } from '../components/mac/MacApp'
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
import { memberViewer, people } from '../fixtures/members'
import { suspendedOrg } from '../fixtures/orgs'
import { bannerSummary } from '../fixtures/pullRequests'
import type { ShortcutChanges } from '../fixtures/shortcutChanges'
import { suspendedOwner } from '../fixtures/startRefusals'
import { paths } from '../paths'
import { placeLostUpdate } from './lostUpdates'
import { changedWorkspaces, chatWorkspacesOf } from './orgWorkspaces'
import { viewerOf } from './sessionStarter'
import { barOf, branchOf } from './workspaceBar'
import { chatPropsOf } from './workspaceChat'
import {
  FilesContent,
  filesPlaceholder,
  openFile,
  ToolContent,
  workspaceSidebar,
} from './workspaceParts'
import {
  transcriptToast,
  workspaceOverlay,
  workspacePalette,
  workspaceToast,
} from './workspaceOverlays'
import { openWorkspace } from './workspaceRun'
import {
  activityOf,
  archiveRestore,
  drawnState,
  sandboxNotice,
} from './workspaceSandbox'
import { WorkspaceSplit } from './workspaceSplit'
import type { WorkspaceState } from './workspaceState'
import { tabRowOf } from './workspaceTabRow'
import { historyFor, tabsFor, workspaceName } from './workspaceTabs'
import styles from './WorkspaceScreen.module.css'

/** The right column in the middle of a drag that widens it, in px. */
const widenedRight = 560

/** The share of the file lists in the middle of a drag that raises the split. */
const raisedSplit = 35

/**
 * An open workspace: its header, its tabs of sessions and files, the pull
 * request, the file lists, and the tools. Desktop shows them side by side; a
 * phone shows one at a time, with tabs to switch. In a suspended org the
 * chat history stays, and nothing in the workspace can change: no message,
 * no new session, no rename, no owner change, no Archive, and no Restore.
 * The centre column can split into two panes, as `WorkspaceSplit` draws.
 * `overlay` lies over the workspace in place of the overlay of its state,
 * such as a dialog that another screen opens over it. The chat and the
 * overlay find the workspaces of their chips in the list of the screen.
 * The toast of the state lies over everything. `shortcuts` holds the
 * person's changes to the shortcuts. With them, the palette rows show their
 * keys, and the Search row shows the person's key of the palette.
 */
export function WorkspaceScreen(props: {
  state: WorkspaceState
  viewport: Viewport
  overlay?: ReactNode
  shortcuts?: ShortcutChanges
}) {
  const { viewport } = props
  const mac = useMacApp()
  const state = drawnState(props.state)
  const suspended = state.org === 'suspended'
  const open = openWorkspace(state)
  const record = open.record
  // An owner's refused start belongs to a suspended member, whom an active
  // admin sees. A suspended org refuses the start of every owner.
  const ownerRefused = state.sandbox === 'refused' && !suspended
  const owner = ownerRefused ? suspendedOwner : record.owner
  // Its row in the list shows the GitHub state of its pull request bar.
  const workspace = {
    ...record,
    owner,
    name: workspaceName(state, record),
    branch: branchOf(state, record),
    github: bannerSummary(state.banner),
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
  const rightHidden = state.rightColumn === 'hidden'
  const rows = chatWorkspacesOf(state, { workspace, status })
  const chatProps = chatPropsOf(state, {
    workspace,
    items: open.items,
    problem,
    viewer,
    viewport,
  })
  const chat = (
    <ChatWorkspaces rows={rows}>
      <ChatPane {...chatProps} />
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
  // Split panes draw their own rows under the header, in place of the row.
  const split =
    state.panes === 'one' ? undefined : (
      <ChatWorkspaces rows={rows}>
        <WorkspaceSplit
          chat={chatProps}
          historyEntries={historyFor(state)}
          panes={state.panes}
          readOnly={readOnly}
          state={state}
          tabs={tabs}
          viewport={viewport}
          workspace={workspace}
        />
      </ChatWorkspaces>
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
  const palette = workspacePalette(state, viewport, {
    open: { workspace, status },
    archivable,
    restorable,
    rightColumn: !rightHidden,
    mac: mac !== undefined,
    shortcuts: props.shortcuts,
  })
  if (viewport === 'mobile') {
    if (state.palette !== 'closed') {
      return <MobileFrame>{palette}</MobileFrame>
    }
    const body = {
      chat: split ?? (
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
        changed: changedWorkspaces(state),
        restoreOpen: state.archive === 'kept',
        shortcuts: props.shortcuts,
      })}
    >
      <WorkspaceBody
        center={
          split ??
          (file ? (
            <FilePage placeholder={filesPlaceholder(state, true)} view={file} />
          ) : (
            chat
          ))
        }
        files={files}
        filesShare={state.resize === 'split' ? raisedSplit : undefined}
        header={header}
        pullRequest={<PullRequestBar bar={bar} workspace={workspace} />}
        rightHidden={rightHidden}
        rightWidth={state.resize === 'right' ? widenedRight : undefined}
        tabs={split ? undefined : tabRow}
        tools={
          archived ? undefined : (
            <ToolsPanel tool={state.tool}>{tool}</ToolsPanel>
          )
        }
      />
    </AppFrame>
  )
}
