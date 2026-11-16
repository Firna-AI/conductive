import type { Ref } from 'react'
import { CircleAlert, CirclePause } from 'lucide-react'
import { OpenTerminals } from './OpenTerminals'
import { ToolButton } from './tool-parts/ToolButtons'
import { ToolRoot } from './tool-parts/ToolRoot'
import { ToolMessage, ToolWaiting } from './tool-parts/ToolStates'
import { workspaceKey, type ToolWorkspace } from './tool-parts/workspace'
import type { TerminalFocusRequest } from './terminalFocus'
import type { TerminalLinks } from './terminalLinks'
import type { TerminalRoute } from './terminalRoute'
import type { ConnectTerminal } from './TerminalScreen'
import { useTerminals, type Terminals } from './useTerminals'

export interface TerminalToolProps {
  workspace: ToolWorkspace
  connect: ConnectTerminal
  /**
   * The shown terminal of the address and of the saved view, the address of
   * each tab, and the show of a terminal. Keep it stable while it names the
   * same terminals.
   */
  route: TerminalRoute
  /** A phone layout: touch sizes and the key row. */
  touch: boolean
  /** The user typed in the terminal. The workspace counts it as activity. */
  onActivity?: () => void
  /**
   * The element of the xterm.js screen of each terminal, where a shell reads
   * the keys. The owner marks it, so the buttons of the tool keep no key.
   */
  screenRef?: Ref<HTMLDivElement>
  /**
   * Opens the links of the output: a click with Cmd on a Mac or Ctrl
   * elsewhere, or a touch. Without it, no link opens.
   */
  links?: TerminalLinks
  /**
   * Moves the keyboard focus to the screen of the shown terminal, such as
   * after a click on the tab of the tool. A request waits until that
   * terminal connects. A hidden terminal never takes it.
   */
  focusRequest?: TerminalFocusRequest | null
  /** The screen took the focus request, or dropped it after a focus move. */
  onFocusDone?: () => void
}

/**
 * What `TerminalToolView` takes: the props of the tool, with the terminals
 * that its owner keeps in place of the workspace.
 */
export type TerminalToolViewProps = Omit<TerminalToolProps, 'workspace'> & {
  /** The terminals of the workspace, from `useTerminals` of the owner. */
  terminals: Terminals
}

/**
 * The Terminal tool: the terminals of the workspace, each a shell in the
 * sandbox, with their tabs. It reads the terminal state, and connects only
 * when the terminal is ready. A running sandbox makes a waiting or loading
 * terminal read its state again.
 */
export function TerminalTool(props: TerminalToolProps) {
  return <OwnTerminals key={workspaceKey(props.workspace)} {...props} />
}

/** The tool with the terminals that it keeps itself while it is mounted. */
function OwnTerminals(props: TerminalToolProps) {
  const { workspace, ...tool } = props
  const terminals = useTerminals(workspace, props.route)
  return <TerminalToolView {...tool} terminals={terminals} />
}

/**
 * The Terminal tool over the terminals that its owner keeps, from
 * `useTerminals`. So the owner can run the + from outside the tool, also
 * before the tool shows. Mount a new view for another workspace.
 */
export function TerminalToolView(props: TerminalToolViewProps) {
  const { view, dispatch, actions } = props.terminals

  const retry = () => dispatch({ type: 'retry' })

  let content
  switch (view.state) {
    case 'loading':
      content = <ToolWaiting label="Opening the terminal" />
      break
    case 'starting':
      content = <ToolWaiting label="Waiting for the sandbox" />
      break
    case 'stopped':
      content = (
        <ToolMessage
          body="Your files and chat are saved."
          icon={CirclePause}
          title="Sandbox stopped"
        />
      )
      break
    case 'error':
      content = (
        <ToolMessage
          action={<ToolButton onPress={retry}>Try again</ToolButton>}
          alert
          body={view.error.message}
          icon={CircleAlert}
          title="The terminal couldn't open"
        />
      )
      break
    case 'ready':
      content = (
        <OpenTerminals
          actions={actions}
          connect={props.connect}
          dispatch={dispatch}
          focusRequest={props.focusRequest}
          links={props.links}
          onActivity={props.onActivity}
          onFocusDone={props.onFocusDone}
          ready={view}
          route={props.route}
          screenRef={props.screenRef}
        />
      )
      break
  }
  return <ToolRoot touch={props.touch}>{content}</ToolRoot>
}
