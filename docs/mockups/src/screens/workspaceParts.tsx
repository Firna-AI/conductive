import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { FilePage } from '../components/files/FilePage'
import { FilesPanel, type FileTabView } from '../components/files/FilesPanel'
import { DesktopView } from '../components/tools/DesktopView'
import { PortPreview, PreviewEmpty } from '../components/tools/PortPreview'
import { TerminalView } from '../components/tools/TerminalView'
import { SandboxPanel } from '../components/workspace/SandboxNotice'
import { replacesLists } from '../components/workspace/sandboxNoticeState'
import {
  archivedSections,
  suspendedSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import {
  creatingLog,
  resumingLog,
  type StartingLog,
} from '../fixtures/starting'
import { orgs } from '../fixtures/orgs'
import { freshSessionPrompt, workspaceSession } from '../fixtures/terminal'
import type { ActivityStatus, Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { panelState } from './workspaceSandbox'
import { isNew } from './workspaceTabs'
import type { WorkspaceState } from './workspaceState'

/** The file that the centre tab shows, when the tab is a file. */
export function openFile(state: WorkspaceState): FileTabView | undefined {
  switch (state.tab) {
    case 'code':
    case 'markdown':
    case 'diff':
      return state.tab
    case 'session':
    case 'new-session':
    case 'linked-session':
      return undefined
  }
}

/** The steps of a sandbox start, while the sandbox starts. */
export function startingLogFor(state: WorkspaceState): StartingLog | undefined {
  if (state.sandbox !== 'starting') return undefined
  return isNew(state) ? creatingLog : resumingLog
}

/**
 * The files panel. After a stop or a failed resume, All files and Changes
 * keep the lists that the workspace saved. Otherwise, while the sandbox is
 * not running, the sandbox state takes the place of the lists. On a phone,
 * an open file shows as a page of the Files tab. An archived workspace has
 * no file lists: its files went with the cloud computer.
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
  const open = openFile(state)
  if (phone && open) {
    const back =
      open === 'diff'
        ? { label: 'Changes', to: paths.filesChanges }
        : { label: 'All files', to: paths.filesAll }
    return <FilePage back={back} view={open} />
  }
  const placeholder =
    panel && replacesLists(panel) ? (
      <SandboxPanel phone={phone} state={panel} />
    ) : undefined
  return (
    <FilesPanel
      banner={state.banner}
      edited={!isNew(state)}
      open={open}
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
  const panel = panelState(state)
  if (panel) return <SandboxPanel phone={mobile} state={panel} />
  switch (state.tool) {
    case 'terminal':
      return isNew(state) ? (
        <TerminalView
          extraKeys={mobile}
          lines={[]}
          prompt={freshSessionPrompt}
        />
      ) : (
        <TerminalView extraKeys={mobile} lines={workspaceSession} />
      )
    case 'preview':
      return state.ports === 'open' ? <PortPreview /> : <PreviewEmpty />
    case 'desktop':
      return <DesktopView />
  }
}

/**
 * The sidebar beside an open workspace, which shows its current status. An
 * archived workspace sits in the open Archived group. In a suspended org
 * every row shows stopped, and nothing in the sidebar changes the org.
 */
export function workspaceSidebar(
  workspace: Workspace,
  status: ActivityStatus,
  suspended: boolean,
): ReactNode {
  if (status !== 'archived') {
    const sections = suspended
      ? suspendedSections(workspace)
      : workspaceSections({ workspace, status })
    return <Sidebar org={orgs.acme} sections={sections} suspended={suspended} />
  }
  const list = archivedSections(workspace, suspended)
  return (
    <Sidebar
      archived={list.archived}
      org={orgs.acme}
      sections={list.sections}
      suspended={suspended}
    />
  )
}
