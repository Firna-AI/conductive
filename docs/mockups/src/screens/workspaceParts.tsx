import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { filePage } from '../entries/components/files/FilePage.mockup'
import type { FileTabView } from '../components/files/FilesPanel'
import { filesPanel } from '../entries/components/files/FilesPanel.mockup'
import type { BackLink } from '../components/layout/Page'
import { desktopView } from '../entries/components/tools/DesktopView.mockup'
import { previewTool } from '../entries/components/tools/PortPreview.mockup'
import { terminalTool } from '../entries/components/tools/TerminalTool.mockup'
import { sandboxPanel } from '../entries/components/workspace/SandboxNotice.mockup'
import {
  replacesList,
  replacesShownFile,
} from '../components/workspace/sandboxNoticeState'
import { defined, plainData } from '../defined'
import { unpushedWork } from '../fixtures/barActions'
import {
  creatingLog,
  firstSecondLog,
  resumingLog,
  type StartingLog,
} from '../fixtures/starting'
import { terminalSets } from '../fixtures/terminals'
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
    case 'code-lines':
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
    case 'code-lines':
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
    <sandboxPanel.Component
      moklyInstance="sandbox-file"
      phone={withAction}
      place="file"
      state={plainData(panel)}
    />
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
    <sandboxPanel.Component
      moklyInstance="sandbox-files"
      phone={phone}
      place="files"
      state={plainData(panel)}
    />
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
    return (
      <sandboxPanel.Component
        moklyInstance="sandbox-files"
        phone={phone}
        place="files"
        state={plainData(panel)}
      />
    )
  }
  const open = openFile(state)
  if (phone && open) {
    return (
      <filePage.Component
        back={backFrom(open)}
        moklyInstance="file-page"
        view={open}
        {...defined({ placeholder: filePlaceholder(state, true) })}
      />
    )
  }
  return (
    <filesPanel.Component
      banner={state.banner}
      edited={!isNew(state)}
      moklyInstance="files-panel"
      paths={state.paths}
      tree={state.tree}
      view={state.files}
      {...defined({
        checksTop: props.checksTop,
        only: changedPaths(state),
        open,
        placeholder: listsPlaceholder(state, phone),
      })}
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
    <terminalTool.Component
      disconnected={state.terminals === 'disconnected'}
      lines={fresh ? [] : set.lines}
      moklyInstance="terminal-tool"
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
      {...defined({
        prompt: fresh ? freshPromptFor(state) : set.prompt,
        shared: set.shared,
      })}
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
  if (panel) {
    return (
      <sandboxPanel.Component
        moklyInstance="sandbox-tools"
        phone={mobile}
        place="tools"
        state={plainData(panel)}
      />
    )
  }
  switch (state.tool) {
    case 'terminal':
      return <TerminalContent state={state} viewport={props.viewport} />
    case 'preview':
      return (
        <previewTool.Component
          moklyInstance="preview-tool"
          state={state.ports}
        />
      )
    case 'desktop':
      return <desktopView.Component moklyInstance="desktop-view" />
  }
}
