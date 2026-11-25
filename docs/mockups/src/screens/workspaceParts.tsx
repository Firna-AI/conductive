import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { filePage } from '../entries/components/files/FilePage.mockup'
import { skillPage } from '../entries/components/files/SkillPage.mockup'
import { filesPanel } from '../entries/components/files/FilesPanel.mockup'
import { desktopView } from '../entries/components/tools/DesktopView.mockup'
import { previewTool } from '../entries/components/tools/PortPreview.mockup'
import { terminalTool } from '../entries/components/tools/TerminalTool.mockup'
import { sandboxPanel } from '../entries/components/workspace/SandboxNotice.mockup'
import {
  replacesList,
  replacesShownFile,
} from '../../../../src/ui/components/workspace/sandboxNoticeState'
import { defined, plainData } from '../defined'
import { unpushedWork } from '../fixtures/barActions'
import {
  creatingLog,
  firstSecondLog,
  resumingLog,
  type StartingLog,
} from '../fixtures/starting'
import { terminalSets } from '../fixtures/terminals'
import { openPort } from '../fixtures/previews'
import { plansAgent } from '../fixtures/skillFiles'
import { paths } from '../paths'
import { rowMenuOf } from './workspaceRowMenu'
import { freshPromptFor, runStartingLog } from './workspaceRun'
import { panelState } from './workspaceSandbox'
import { previewServicesOf } from './workspaceServices'
import { backFrom, openFile } from './workspaceFileTab'
import { openSkill, showsSkillText } from './workspaceSkillTab'
import { isNew } from './workspaceTabs'
import type { WorkspaceState } from './workspaceState'

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
 * moved to the new branch, or none. After a repository change: none, as
 * the new branch starts clean in the mockups. Any other branch shows every
 * change.
 */
function changedPaths(state: WorkspaceState): readonly string[] | undefined {
  if (state.repositoryMove === 'changed') return []
  if (state.branch !== 'continued') return undefined
  return state.localWork === 'changes' ? unpushedWork.files : []
}

/**
 * The sandbox state in place of the content of an open file: while the
 * sandbox starts, because the tab opened then and shows no content yet,
 * while its start is refused, and after a failed first start. A stopped
 * sandbox, one whose later start failed, and an archived one keep the
 * content that the tab shows. A tab without content, `hasContent` false,
 * such as a skill tab whose text still loads, shows their state too, with
 * Resume or Try again, as the app does. `withAction` adds the action and
 * the words of a refusal, as a phone shows them, and as a file page shows
 * them on desktop, where the page hides the bar of the chat.
 */
export function filePlaceholder(
  state: WorkspaceState,
  withAction: boolean,
  hasContent = true,
): ReactNode {
  const panel = panelState(state)
  const replaces =
    panel !== undefined &&
    (panel.problem === 'starting' || replacesShownFile(panel) || !hasContent)
  return replaces ? (
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
 * with the sandbox state in place of its content, as on desktop. An open
 * skill shows there in the same way, and leads back to All files, as a
 * file does. An archived workspace has no file lists: its files went with
 * the cloud computer. A row of the lists can show its open menu.
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
  const skill = openSkill(state)
  if (phone && skill) {
    return (
      <skillPage.Component
        agent={plansAgent}
        back={{ label: 'All files', to: paths.filesAll }}
        moklyInstance="skill-page"
        view={skill}
        {...defined({
          placeholder: filePlaceholder(state, true, showsSkillText(skill)),
        })}
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
        // Complete lists pass nothing, so the panel keeps its earlier props.
        lists: state.lists === 'limited' ? state.lists : undefined,
        menu: rowMenuOf(state, props.viewport),
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
    case 'preview': {
      // The services section is React content, so it goes in a slot, and
      // the servers beside it go as data.
      const services = previewServicesOf(state, props.viewport)
      return (
        <previewTool.Component
          frame={mobile}
          moklyInstance="preview-tool"
          shownPort={state.tab === 'preview' ? openPort : null}
          state={state.ports}
          {...defined({
            services: services?.section,
            servers: services?.servers && plainData(services.servers),
          })}
        />
      )
    }
    case 'desktop':
      return <desktopView.Component moklyInstance="desktop-view" />
  }
}
