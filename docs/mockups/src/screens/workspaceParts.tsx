import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { FilePage } from '../components/files/FilePage'
import { FilesPanel, type FileTabView } from '../components/files/FilesPanel'
import type { BackLink } from '../components/layout/Page'
import { DesktopView } from '../components/tools/DesktopView'
import { PreviewTool } from '../components/tools/PortPreview'
import { TerminalView } from '../components/tools/TerminalView'
import { SandboxPanel } from '../components/workspace/SandboxNotice'
import { replacesLists } from '../components/workspace/sandboxNoticeState'
import {
  activationLog,
  branchStartLog,
  creatingLog,
  firstSecondLog,
  resumingLog,
  type StartingLog,
} from '../fixtures/starting'
import { terminalProcesses } from '../fixtures/terminal'
import { paths } from '../paths'
import { importedScreensOf } from './importedScreens'
import { hasFileLists, importedPanel, isImported } from './importedWorkspace'
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
    case 'old-session':
      return 'old-session'
    case 'session':
    case 'new-session':
    case 'linked-session':
    case 'later-session':
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

/**
 * A file as a page of a phone, with its way back, and with the sandbox state
 * in place of its content while the sandbox does not run.
 */
export function PhoneFilePage(props: {
  state: WorkspaceState
  view: FileTabView
}) {
  return (
    <FilePage
      back={backFrom(props.view, props.state)}
      placeholder={filePagePlaceholder(props.state, props.view)}
      view={props.view}
    />
  )
}

/**
 * The steps of a sandbox start, while the sandbox starts. A new workspace
 * that still shows Untitled is in the first second of its start. A new
 * workspace on a chosen branch fetches that branch. A workspace from
 * Conductor shows its activation.
 */
export function startingLogFor(state: WorkspaceState): StartingLog | undefined {
  if (state.sandbox !== 'starting') return undefined
  const run = runStartingLog(state)
  if (run) return run
  if (isImported(state)) return activationLog
  if (!isNew(state)) return resumingLog
  if (state.workspace === 'saved-carts-branch') return branchStartLog
  return state.name === 'untitled' ? firstSecondLog : creatingLog
}

/**
 * The sandbox state in place of All files, Changes, and the content of an
 * open file: while the sandbox starts, while its start is refused, and
 * after a failed first start. A stopped sandbox, and one whose later start
 * failed, keep them. `withAction` adds the action and the words of a
 * refusal, as a phone shows them, and as a file page shows them on desktop,
 * where the page hides the bar of the chat. A workspace from Conductor
 * shows its own panel while it has no cloud computer.
 */
function filesPlaceholder(
  state: WorkspaceState,
  withAction: boolean,
): ReactNode {
  const imported = importedPanel(state, withAction)
  if (imported) return imported
  const panel = panelState(state)
  return panel && replacesLists(panel) ? (
    <SandboxPanel phone={withAction} state={panel} />
  ) : undefined
}

/**
 * What a file page shows in place of its content: the sandbox state, with
 * its action. The Markdown of an old session has none, because the app
 * keeps that file, so it opens with no cloud computer too.
 */
export function filePagePlaceholder(
  state: WorkspaceState,
  view: FileTabView,
): ReactNode {
  return view === 'old-session' ? undefined : filesPlaceholder(state, true)
}

/**
 * The files panel. After a stop or a failed resume, All files and Changes
 * keep the lists that the workspace saved. Otherwise, while the sandbox is
 * not running, the sandbox state takes the place of the lists. On a phone,
 * an open file shows as a page of the Files tab, with the same sandbox
 * state in place of its content. An archived workspace has no file lists:
 * its files went with the cloud computer. A workspace from Conductor keeps
 * its list tabs in its own screens, and an archived one that never had a
 * cloud computer has no lists either.
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
  const placeholder = filesPlaceholder(state, phone)
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
      // idle prompt on its own repository and branch. The workspace of a
      // routine run is new, so it waits at its prompt.
      const lines =
        state.run === undefined ? terminalProcesses[state.workspace] : null
      return lines === null ? (
        <TerminalView
          extraKeys={mobile}
          lines={[]}
          prompt={freshPromptFor(state)}
        />
      ) : (
        <TerminalView extraKeys={mobile} lines={lines} />
      )
    }
    case 'preview':
      return <PreviewTool state={state.ports} />
    case 'desktop':
      return <DesktopView />
  }
}
