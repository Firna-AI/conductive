import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { WorkspaceChat } from './workspaceChat'
import { ChatWorkspaces } from '../components/chat/chatWorkspaces'
import {
  appFrame,
  mobileFrame,
} from '../entries/components/layout/AppFrame.mockup'
import { acmeRail } from '../components/layout/OrgRail'
import { useMacApp } from '../../../../src/ui/components/mac/MacApp'
import { ChatMarks } from '../components/explain/chatMarks'
import { checksActions } from '../entries/components/workspace/BarActions.mockup'
import { WorkspaceMobile } from './workspaceMobile'
import { pullRequestBar } from '../entries/components/workspace/PullRequestBar.mockup'
import { toolsPanel } from '../entries/components/workspace/ToolsPanel.mockup'
import { workspaceBody } from '../entries/components/workspace/WorkspaceBody.mockup'
import { workspaceHeader } from '../entries/components/workspace/WorkspaceHeader.mockup'
import { workspaceTabs } from '../entries/components/workspace/WorkspaceTabs.mockup'
import { defined, plainData } from '../defined'
import { memberViewer, people } from '../fixtures/members'
import { suspendedOrg } from '../fixtures/orgs'
import type { ShortcutChanges } from '../fixtures/shortcutChanges'
import { paths } from '../paths'
import { isRunning } from './composerFor'
import { centreOf } from './workspaceCentre'
import { placeLostUpdate } from './lostUpdates'
import { resizedColumns } from './layoutState'
import { chatWorkspacesOf } from './orgWorkspaces'
import { chatMarksOf } from './explainMarks'
import { headerMenusOf } from './workspaceBar'
import { headerMenuOf } from './workspaceHeaderMenu'
import { workspaceOpen } from './workspaceOpen'
import {
  filesContent,
  toolContent,
} from '../entries/components/screens/workspaceParts.mockup'
import { workspaceSidebar } from './workspaceSidebar'
// The toasts lay first in the old module of the overlays, so their styles
// keep their place before the styles of the dialogs.
import { copyToast, workspaceToast } from './workspaceToasts'
import { workspaceOverlay, workspacePalette } from './workspaceOverlays'
import type { WorkspaceState } from './workspaceState'
import { tabRowOf } from './workspaceTabRow'
import { historyFor, tabsFor } from './workspaceTabs'
import { WorkspaceLinks } from './workspaceLinks'
import styles from '../../../../src/ui/screens/WorkspaceScreen.module.css'

/**
 * An open workspace: its header, its tabs of sessions and files, the pull
 * request, the file lists, and the tools. Desktop shows them side by side; a
 * phone shows one at a time, with tabs to switch. In a suspended org the
 * chat history stays, and nothing in the workspace can change: no message,
 * no new session, no rename, no owner change, no Archive, and no Restore.
 * `overlay` lies over the workspace in place of the overlay of its state,
 * such as a dialog that another screen opens over it. The chat and the
 * overlay find the workspaces of their chips in the list of the screen,
 * and the chat draws the marks of explanations over its messages.
 * The toast of the state lies over everything. `shortcuts` holds the
 * person's changes to the shortcuts. With them, the palette rows show their
 * keys, and the Search row shows the person's key of the palette.
 * `picker` takes the place of the model picker of the message box.
 */
export function WorkspaceScreen(props: {
  state: WorkspaceState
  viewport: Viewport
  overlay?: ReactNode
  shortcuts?: ShortcutChanges
  picker?: ReactNode
}) {
  const { viewport } = props
  const mac = useMacApp()
  const {
    state,
    open,
    workspace,
    status,
    suspended,
    archived,
    readOnly,
    viewer,
    membership,
    archivable,
    restorable,
    bar,
  } = workspaceOpen(props.state)
  const admin = state.viewer === 'admin'
  const rightHidden = state.rightColumn === 'hidden'
  const rows = chatWorkspacesOf(state, { workspace, status })
  const chat = (
    <ChatMarks marks={chatMarksOf(state)}>
      <WorkspaceChat
        items={open.items}
        picker={props.picker}
        rows={rows}
        state={state}
        viewer={viewer}
        viewport={viewport}
        workspace={workspace}
      />
    </ChatMarks>
  )
  const headerBar = (
    <workspaceHeader.Component
      canReassign={admin && !readOnly}
      canRestart={!readOnly}
      moklyInstance="workspace-header"
      name={workspace.name}
      renaming={state.overlay === 'header-rename'}
      rightHidden={rightHidden}
      status={status}
      viewport={viewport}
      workspace={workspace}
      {...defined({
        ...headerMenusOf(state),
        back: suspended ? paths.suspendedOrg : undefined,
        copy: state.copyLink === 'none' ? undefined : state.copyLink,
        menu:
          state.overlay === 'workspace-menu' && viewport === 'desktop'
            ? headerMenuOf(state, workspace.owner)
            : undefined,
        run: open.run,
      })}
    />
  )
  // A phone and an archived workspace show only the session tabs.
  const tabs = tabsFor(state, workspace, isRunning(state)).filter(
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
      {copyToast(state, viewport)}
    </ChatWorkspaces>
  )
  const tabRow = (
    <workspaceTabs.Component
      historyEntries={historyFor(state)}
      historyOpen={state.overlay === 'history'}
      moklyInstance="workspace-tabs"
      readOnly={readOnly}
      tabs={plainData(tabs)}
      viewport={viewport}
      {...defined({
        drag: row.drag,
        full: row.full,
        menuTab: row.menuTab,
        renaming: row.renaming,
      })}
    />
  )
  // A phone shows the actions of the bar at the top of the Checks tab.
  const checksTop =
    viewport === 'mobile' ? (
      <checksActions.Component
        bar={plainData(bar)}
        moklyInstance="checks-actions"
        workspace={workspace}
      />
    ) : undefined
  const { header, files } = placeLostUpdate(state, {
    header: headerBar,
    files: (
      <filesContent.Component
        moklyInstance="files-content"
        state={state}
        viewport={viewport}
        {...defined({ checksTop })}
      />
    ),
  })
  const tool = (
    <toolContent.Component
      moklyInstance="tool-content"
      state={state}
      viewport={viewport}
    />
  )
  const toast = workspaceToast(state, workspace, viewport)
  const palette = workspacePalette(state, viewport, {
    open: { workspace, status },
    archivable,
    restorable,
    rightColumn: !rightHidden,
    sidebar: true,
    mac: mac !== undefined,
    shortcuts: props.shortcuts,
  })
  if (viewport === 'mobile') {
    if (state.palette !== 'closed') {
      return <mobileFrame.Component>{palette}</mobileFrame.Component>
    }
    const views = {
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
      <WorkspaceLinks lists={state.lists}>
        <WorkspaceMobile
          archived={archived}
          bar={bar}
          header={header}
          overlay={overlay}
          selected={state.focus === 'tool' ? state.tool : state.focus}
          toast={toast}
          body={
            <div className={styles.mobileBody}>
              {archived ? views.chat : views[state.focus]}
            </div>
          }
        />
      </WorkspaceLinks>
    )
  }
  return (
    <WorkspaceLinks lists={state.lists}>
      <appFrame.Component
        overlay={
          <>
            {palette ?? overlay}
            {toast}
          </>
        }
        rail={{
          ...acmeRail,
          ...(suspended ? { suspended: suspendedOrg } : {}),
          ...(admin ? {} : { person: people[memberViewer] }),
        }}
        sidebarView={state.sidebar}
        sidebar={workspaceSidebar({
          state,
          workspace,
          status,
          viewer: membership,
          shortcuts: props.shortcuts,
        })}
      >
        <workspaceBody.Component
          center={centreOf(state, chat)}
          files={files}
          header={header}
          moklyInstance="workspace-body"
          pullRequest={
            <pullRequestBar.Component
              bar={plainData(bar)}
              moklyInstance="pull-request-bar"
              workspace={workspace}
            />
          }
          rightHidden={rightHidden}
          tabs={tabRow}
          {...defined({
            ...resizedColumns(state.resize),
            tools: archived ? undefined : (
              <toolsPanel.Component
                moklyInstance="tools-panel"
                tool={state.tool}
              >
                {tool}
              </toolsPanel.Component>
            ),
          })}
        />
      </appFrame.Component>
    </WorkspaceLinks>
  )
}
