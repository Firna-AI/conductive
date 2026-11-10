import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { FilePage } from '../components/files/FilePage'
import { FilesPanel, type FileTabView } from '../components/files/FilesPanel'
import type { BackLink } from '../components/layout/Page'
import { DesktopView } from '../components/tools/DesktopView'
import { PortPreview, PreviewEmpty } from '../components/tools/PortPreview'
import { TerminalTool } from '../components/tools/TerminalTool'
import { SandboxPanel } from '../components/workspace/SandboxNotice'
import { replacesLists } from '../components/workspace/sandboxNoticeState'
import {
  archivedSections,
  suspendedSections,
  workspaceSections,
  type OpenWorkspace,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import {
  creatingLog,
  firstSecondLog,
  resumingLog,
  type StartingLog,
} from '../fixtures/starting'
import { orgs } from '../fixtures/orgs'
import type { Membership } from '../fixtures/members'
import { freshSessionPrompt } from '../fixtures/terminal'
import { terminalSets } from '../fixtures/terminals'
import type { ActivityStatus, Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
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
    case 'session':
    case 'new-session':
    case 'linked-session':
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
      return { label: 'All files', to: paths.filesAll }
  }
}

/**
 * The steps of a sandbox start, while the sandbox starts. A new workspace
 * that still shows Untitled is in the first second of its start.
 */
export function startingLogFor(state: WorkspaceState): StartingLog | undefined {
  if (state.sandbox !== 'starting') return undefined
  if (!isNew(state)) return resumingLog
  return state.name === 'untitled' ? firstSecondLog : creatingLog
}

/**
 * The sandbox state in place of All files, Changes, and the content of an
 * open file: while the sandbox starts, while its start is refused, and
 * after a failed first start. A stopped sandbox, and one whose later start
 * failed, keep them. `withAction` adds the action and the words of a
 * refusal, as a phone shows them, and as a file page shows them on desktop,
 * where the page hides the bar of the chat.
 */
export function filesPlaceholder(
  state: WorkspaceState,
  withAction: boolean,
): ReactNode {
  const panel = panelState(state)
  return panel && replacesLists(panel) ? (
    <SandboxPanel phone={withAction} state={panel} />
  ) : undefined
}

/**
 * The files panel. After a stop or a failed resume, All files and Changes
 * keep the lists that the workspace saved. Otherwise, while the sandbox is
 * not running, the sandbox state takes the place of the lists. On a phone,
 * an open file shows as a page of the Files tab, with the same sandbox
 * state in place of its content. An archived workspace has no file lists:
 * its files went with the cloud computer.
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
  const placeholder = filesPlaceholder(state, phone)
  if (phone && open) {
    return (
      <FilePage back={backFrom(open)} placeholder={placeholder} view={open} />
    )
  }
  return (
    <FilesPanel
      banner={state.banner}
      edited={!isNew(state)}
      open={open}
      paths={state.paths}
      placeholder={placeholder}
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
      prompt={fresh ? freshSessionPrompt : set.prompt}
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
      return state.ports === 'open' ? <PortPreview /> : <PreviewEmpty />
    case 'desktop':
      return <DesktopView />
  }
}

/**
 * The sidebar beside an open workspace, which shows its current status. An
 * archived workspace sits in the open Archived group. In a suspended org
 * every row shows stopped, and nothing in the sidebar changes the org.
 * `created` adds the workspaces that the create flow made by then.
 */
export function workspaceSidebar(
  workspace: Workspace,
  status: ActivityStatus,
  suspended: boolean,
  viewer: Membership,
  created: readonly OpenWorkspace[] = [],
): ReactNode {
  if (status !== 'archived') {
    const sections = suspended
      ? suspendedSections(workspace)
      : workspaceSections({ workspace, status }, undefined, created)
    return (
      <Sidebar
        org={orgs.acme}
        sections={sections}
        suspended={suspended}
        viewer={viewer}
      />
    )
  }
  const list = archivedSections(workspace, suspended)
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
