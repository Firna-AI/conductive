import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { FilePage } from '../components/files/FilePage'
import { FilesPanel, type FileTabView } from '../components/files/FilesPanel'
import type { BackLink } from '../components/layout/Page'
import { DesktopView } from '../components/tools/DesktopView'
import { PortPreview, PreviewEmpty } from '../components/tools/PortPreview'
import { TerminalView } from '../components/tools/TerminalView'
import { SandboxPanel } from '../components/workspace/SandboxNotice'
import { replacesLists } from '../components/workspace/sandboxNoticeState'
import {
  archivedSections,
  archivedWithImport,
  sectionsWithImport,
  suspendedSections,
  workspaceSections,
  type OpenWorkspace,
  type SidebarSection,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { importedWorkspaces } from '../fixtures/importedWorkspaces'
import {
  activationLog,
  branchStartLog,
  creatingLog,
  firstSecondLog,
  resumingLog,
  type StartingLog,
} from '../fixtures/starting'
import { orgs } from '../fixtures/orgs'
import type { Membership } from '../fixtures/members'
import { openableWorkspaceRecords } from '../fixtures/openableWorkspaces'
import { idlePrompt, terminalProcesses } from '../fixtures/terminal'
import type { Workspace, WorkspaceStatus } from '../fixtures/workspaces'
import { paths } from '../paths'
import { importedScreensOf } from './importedScreens'
import { hasFileLists, importedPanel, isImported } from './importedWorkspace'
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
    case 'old-session':
      return 'old-session'
    case 'session':
    case 'new-session':
    case 'linked-session':
      return undefined
  }
}

/**
 * The way back from a file page on a phone: to its list, or to the chat
 * for the Markdown of an old session.
 */
function backFrom(
  open: FileTabView,
  state: WorkspaceState,
): BackLink | undefined {
  switch (open) {
    case 'diff':
      return { label: 'Changes', to: paths.filesChanges }
    case 'masked-diff':
      return { label: 'Changes', to: paths.maskedPathsChanges }
    case 'unnamed':
      return { label: 'All files', to: paths.maskedPathsAllFiles }
    case 'code':
    case 'markdown':
      return { label: 'All files', to: paths.filesAll }
    case 'old-session': {
      // A state that draws no chat keeps the way back static.
      const { chat } = importedScreensOf(state)
      return chat === null ? undefined : { label: 'Chat', to: chat }
    }
  }
}

/** A file as a page of a phone, with its way back. */
export function PhoneFilePage(props: {
  state: WorkspaceState
  view: FileTabView
}) {
  return <FilePage back={backFrom(props.view, props.state)} view={props.view} />
}

/**
 * The steps of a sandbox start, while the sandbox starts. A new workspace
 * that still shows Untitled is in the first second of its start. A new
 * workspace on a chosen branch fetches that branch. A workspace from
 * Conductor shows its activation.
 */
export function startingLogFor(state: WorkspaceState): StartingLog | undefined {
  if (state.sandbox !== 'starting') return undefined
  if (isImported(state)) return activationLog
  if (!isNew(state)) return resumingLog
  if (state.workspace === 'saved-carts-branch') return branchStartLog
  return state.name === 'untitled' ? firstSecondLog : creatingLog
}

/**
 * The screen of the open workspace in its state, for its selected row,
 * where the mockups draw one screen for each state: a workspace from
 * Conductor, and the new workspace on a chosen branch. Null keeps the row
 * static for an imported state that no entry draws. Undefined keeps the
 * row of every other workspace.
 */
export function openRowPath(state: WorkspaceState): string | null | undefined {
  if (isImported(state)) return importedScreensOf(state).chat
  if (state.workspace !== 'saved-carts-branch') return undefined
  if (state.sandbox === 'starting') return paths.newWorkspaceBranchStart
  if (state.sandbox === 'error') return paths.newWorkspaceBranchGone
  return undefined
}

/**
 * The files panel. After a stop or a failed resume, All files and Changes
 * keep the lists that the workspace saved. Otherwise, while the sandbox is
 * not running, the sandbox state takes the place of the lists. On a phone,
 * an open file shows as a page of the Files tab. An archived workspace has
 * no file lists: its files went with the cloud computer. A workspace from
 * Conductor keeps its list tabs in its own screens, and an archived one
 * that never had a cloud computer has no lists either.
 */
export function FilesContent(props: {
  state: WorkspaceState
  viewport: Viewport
}) {
  const { state } = props
  const phone = props.viewport === 'mobile'
  const panel = panelState(state)
  if (panel?.problem === 'archived') {
    return <SandboxPanel phone={phone} state={panel} />
  }
  if (state.sandbox === 'archived-inactive') return importedPanel(state, phone)
  const open = openFile(state)
  // A phone shows the Markdown of an old session in Chat, not in Files.
  if (phone && open && open !== 'old-session') {
    return <PhoneFilePage state={state} view={open} />
  }
  const placeholder =
    importedPanel(state, phone) ??
    (panel && replacesLists(panel) ? (
      <SandboxPanel phone={phone} state={panel} />
    ) : undefined)
  return (
    <FilesPanel
      banner={state.banner}
      edited={!isNew(state) && hasFileLists(state)}
      links={
        isImported(state) ? { all: importedScreensOf(state).files } : undefined
      }
      open={open}
      paths={state.paths}
      placeholder={placeholder}
      tree={state.tree}
      view={state.files}
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
  const imported = importedPanel(state, mobile)
  if (imported) return imported
  const panel = panelState(state)
  if (panel) return <SandboxPanel phone={mobile} state={panel} />
  switch (state.tool) {
    case 'terminal': {
      // The terminal belongs to the open workspace: its own process, or an
      // idle prompt on its own repository and branch.
      const lines = terminalProcesses[state.workspace]
      const workspace = openableWorkspaceRecords[state.workspace]
      return lines === null ? (
        <TerminalView
          extraKeys={mobile}
          lines={[]}
          prompt={idlePrompt(workspace)}
        />
      ) : (
        <TerminalView extraKeys={mobile} lines={lines} />
      )
    }
    case 'preview':
      return state.ports === 'open' ? <PortPreview /> : <PreviewEmpty />
    case 'desktop':
      return <DesktopView />
  }
}

/** The sections of the sidebar beside an open workspace that is not archived. */
function sectionsOf(
  open: OpenWorkspace,
  suspended: boolean,
  created: readonly OpenWorkspace[],
  openTo?: string | null,
): SidebarSection[] {
  if (suspended) return suspendedSections(open.workspace)
  if (open.workspace.from === 'conductor') {
    return sectionsWithImport(importedWorkspaces, open, openTo)
  }
  return workspaceSections(open, undefined, created, openTo ?? undefined)
}

/**
 * The sidebar beside an open workspace, which shows its current status. An
 * archived workspace sits in the open Archived group. In a suspended org
 * every row shows stopped, and nothing in the sidebar changes the org.
 * `created` adds the workspaces that the create flow made by then. A
 * workspace from Conductor sits in Import from Conductor, with the other
 * workspaces of its import. `openTo` keeps the screen of the state of the
 * open workspace on its selected row, where the mockups draw one.
 */
export function workspaceSidebar(
  workspace: Workspace,
  status: WorkspaceStatus,
  suspended: boolean,
  viewer: Membership,
  created: readonly OpenWorkspace[] = [],
  openTo?: string | null,
): ReactNode {
  if (status !== 'archived') {
    const open = { workspace, status }
    return (
      <Sidebar
        org={orgs.acme}
        sections={sectionsOf(open, suspended, created, openTo)}
        suspended={suspended}
        viewer={viewer}
      />
    )
  }
  const list =
    workspace.from === 'conductor'
      ? archivedWithImport(workspace, importedWorkspaces, openTo)
      : archivedSections(workspace, suspended)
  return (
    <Sidebar
      archived={list.archived}
      org={orgs.acme}
      sections={list.sections}
      suspended={suspended}
      viewer={viewer}
    />
  )
}
