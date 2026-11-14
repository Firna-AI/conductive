import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { FilePage } from '../components/files/FilePage'
import { FilesPanel, type FileTabView } from '../components/files/FilesPanel'
import type { BackLink } from '../components/layout/Page'
import { DesktopView } from '../components/tools/DesktopView'
import { PreviewTool } from '../components/tools/PortPreview'
import { TerminalTool } from '../components/tools/TerminalTool'
import { SandboxPanel } from '../components/workspace/SandboxNotice'
import {
  replacesList,
  replacesShownFile,
} from '../components/workspace/sandboxNoticeState'
import {
  archivedSections,
  suspendedSections,
  workspaceSections,
  type ChangedWorkspace,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { unpushedWork } from '../fixtures/barActions'
import {
  creatingLog,
  firstSecondLog,
  resumingLog,
  type StartingLog,
} from '../fixtures/starting'
import { orgs } from '../fixtures/orgs'
import type { Membership } from '../fixtures/members'
import type { ShortcutChanges } from '../fixtures/shortcutChanges'
import { terminalSets } from '../fixtures/terminals'
import type { ActivityStatus, Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { freshPromptFor, runStartingLog } from './workspaceRun'
import { panelState } from './workspaceSandbox'
import { isNew } from './workspaceTabs'
import type { WorkspaceState } from './workspaceState'

/**
 * The file that the centre tab shows, when the tab is a file. With masked
 * paths, a diff opens the masked seed script.
 */
export function openFile(state: WorkspaceState): FileTabView | undefined {
  switch (state.tab) {
    case 'code':
    case 'markdown':
      return state.tab
    case 'diff':
      return state.paths === 'masked' ? 'masked-diff' : 'diff'
    case 'unnamed-file':
      return 'unnamed'
    case 'image':
    case 'image-not-drawn':
    case 'attachment':
      return state.tab
    case 'session':
    case 'new-session':
    case 'linked-session':
    case 'later-session':
      return undefined
  }
}

/** The way back from a file page on a phone: to its list. */
function backFrom(open: FileTabView): BackLink {
  switch (open) {
    case 'diff':
      return { label: 'Changes', to: paths.filesChanges }
    case 'masked-diff':
      return { label: 'Changes', to: paths.maskedPathsChanges }
    case 'unnamed':
      return { label: 'All files', to: paths.maskedPathsAllFiles }
    case 'code':
    case 'markdown':
    case 'image':
    case 'image-not-drawn':
    case 'attachment':
      return { label: 'All files', to: paths.filesAll }
  }
}

/**
 * The steps of a sandbox start, while the sandbox starts. A new workspace
 * that still shows Untitled is in the first second of its start.
 */
export function startingLogFor(state: WorkspaceState): StartingLog | undefined {
  if (state.sandbox !== 'starting') return undefined
  const run = runStartingLog(state)
  if (run) return run
  if (!isNew(state)) return resumingLog
  return state.name === 'untitled' ? firstSecondLog : creatingLog
}

/**
 * The changed paths of the branch after Continue: the changed files that
 * moved to the new branch, or none. Any other branch shows every change.
 */
function changedPaths(state: WorkspaceState): readonly string[] | undefined {
  if (state.branch !== 'continued') return undefined
  return state.localWork === 'changes' ? unpushedWork.files : []
}

/**
 * The sandbox state in place of the content of an open file: while the
 * sandbox starts, because the tab opened then and shows no content yet,
 * while its start is refused, and after a failed first start. A stopped
 * sandbox, and one whose later start failed, keep the file. `withAction`
 * adds the action and the words of a refusal, as a phone shows them, and as
 * a file page shows them on desktop, where the page hides the bar of the
 * chat.
 */
export function filePlaceholder(
  state: WorkspaceState,
  withAction: boolean,
): ReactNode {
  const panel = panelState(state)
  return panel && (panel.problem === 'starting' || replacesShownFile(panel)) ? (
    <SandboxPanel phone={withAction} state={panel} />
  ) : undefined
}

/**
 * The sandbox state in place of All files and Changes: while the start is
 * refused, after a failed first start, and while a new workspace starts,
 * because it has no saved lists yet. Another start, a stop, and a failed
 * resume keep the lists that the workspace saved.
 */
function listsPlaceholder(state: WorkspaceState, phone: boolean): ReactNode {
  const panel = panelState(state)
  return panel && replacesList(panel, !isNew(state)) ? (
    <SandboxPanel phone={phone} state={panel} />
  ) : undefined
}

/**
 * The files panel. While the sandbox starts, after a stop, and after a
 * failed resume, All files and Changes keep the lists that the workspace
 * saved. A new workspace has none, so the wait of its first start takes
 * their place, and so does the sandbox state of a refused start or a failed
 * first start. On a phone, an open file shows as a page of the Files tab,
 * with the sandbox state in place of its content, as on desktop. An
 * archived workspace has no file lists: its files went with the cloud
 * computer.
 */
export function FilesContent(props: {
  state: WorkspaceState
  viewport: Viewport
  /** What a phone shows at the top of the Checks tab: the bar's actions. */
  checksTop?: ReactNode
}) {
  const { state } = props
  const phone = props.viewport === 'mobile'
  const panel = panelState(state)
  if (panel?.problem === 'archived') {
    return <SandboxPanel phone={phone} state={panel} />
  }
  const open = openFile(state)
  if (phone && open) {
    return (
      <FilePage
        back={backFrom(open)}
        placeholder={filePlaceholder(state, true)}
        view={open}
      />
    )
  }
  return (
    <FilesPanel
      banner={state.banner}
      checksTop={props.checksTop}
      edited={!isNew(state)}
      only={changedPaths(state)}
      open={open}
      paths={state.paths}
      placeholder={listsPlaceholder(state, phone)}
      tree={state.tree}
      view={state.files}
    />
  )
}

/**
 * The Terminal tool of the state. A new workspace waits at the first prompt
 * of its one terminal. The close button of the shown terminal opens the
 * question before the close. The cloud computer software of `older` opens
 * one terminal only, so the tool shows no tabs.
 */
function TerminalContent(props: { state: WorkspaceState; viewport: Viewport }) {
  const { state } = props
  const set = terminalSets[state.terminals]
  const fresh = isNew(state)
  return (
    <TerminalTool
      disconnected={state.terminals === 'disconnected'}
      lines={fresh ? [] : set.lines}
      prompt={fresh ? freshPromptFor(state) : set.prompt}
      shared={set.shared}
      tabs={
        state.terminals === 'older'
          ? null
          : {
              numbers: set.numbers,
              shown: set.shown,
              atLimit: state.terminals === 'limit',
              closeTo: paths.closeTerminal,
            }
      }
      viewport={props.viewport}
    />
  )
}

/** The tool of the tools panel, or the sandbox state while it is down. */
export function ToolContent(props: {
  state: WorkspaceState
  viewport: Viewport
}) {
  const { state } = props
  const mobile = props.viewport === 'mobile'
  const panel = panelState(state)
  if (panel) return <SandboxPanel phone={mobile} state={panel} />
  switch (state.tool) {
    case 'terminal':
      return <TerminalContent state={state} viewport={props.viewport} />
    case 'preview':
      return <PreviewTool state={state.ports} />
    case 'desktop':
      return <DesktopView />
  }
}

/**
 * The sidebar beside an open workspace, which shows its current status. An
 * archived workspace sits in the open Archived group. In a suspended org
 * every row shows stopped, and nothing in the sidebar changes the org.
 */
export function workspaceSidebar(props: {
  workspace: Workspace
  status: ActivityStatus
  suspended: boolean
  viewer: Membership
  /** The rows that differ from the list of when the app opens, by then. */
  changed: readonly ChangedWorkspace[]
  /** The last day of Restore of the archived workspace has not passed. */
  restoreOpen: boolean
  /** The person's changes to the shortcuts, for the key of the Search row. */
  shortcuts?: ShortcutChanges
}): ReactNode {
  const { workspace, status, suspended, viewer, changed, shortcuts } = props
  if (status !== 'archived') {
    const sections = suspended
      ? suspendedSections(workspace)
      : workspaceSections({ workspace, status }, undefined, changed)
    return (
      <Sidebar
        org={orgs.acme}
        sections={sections}
        shortcuts={shortcuts}
        suspended={suspended}
        viewer={viewer}
      />
    )
  }
  const list = archivedSections(workspace, suspended, props.restoreOpen)
  return (
    <Sidebar
      archived={list.archived}
      org={orgs.acme}
      sections={list.sections}
      shortcuts={shortcuts}
      suspended={suspended}
      viewer={viewer}
    />
  )
}
