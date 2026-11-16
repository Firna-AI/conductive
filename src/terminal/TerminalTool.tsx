import { useCallback, type Ref } from 'react'
import { CircleAlert, CirclePause } from 'lucide-react'
import { useWorkspaceStore } from '../app/workspace-store'
import { OpenTerminals } from './OpenTerminals'
import { ToolButton } from './tool-parts/ToolButtons'
import { ToolRoot } from './tool-parts/ToolRoot'
import { ToolMessage, ToolWaiting } from './tool-parts/ToolStates'
import { workspaceKey, type ToolWorkspace } from './tool-parts/workspace'
import { createTerminalStore, type TerminalStore } from './terminalStore'
import type { TerminalLinks } from './terminalLinks'
import type { TerminalRoute } from './terminalRoute'
import type { ConnectTerminal } from './TerminalScreen'

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
}

/**
 * The Terminal tool: the terminals of the workspace, each a shell in the
 * sandbox, with their tabs. It reads the terminal state, and connects only
 * when the terminal is ready. A running sandbox makes a waiting or loading
 * terminal read its state again.
 */
export function TerminalTool(props: TerminalToolProps) {
  return <TerminalToolBody key={workspaceKey(props.workspace)} {...props} />
}

function TerminalToolBody(props: TerminalToolProps) {
  const { fetch, subscribe } = props.workspace
  const connect = useCallback(
    (store: TerminalStore) => store.connect({ fetch, subscribe }),
    [fetch, subscribe],
  )
  const { store, snapshot } = useWorkspaceStore(props.workspace, {
    create: createTerminalStore,
    connect,
  })
  const { view } = snapshot
  const { dispatch } = store

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
          connect={props.connect}
          dispatch={dispatch}
          links={props.links}
          onActivity={props.onActivity}
          ready={view}
          route={props.route}
          screenRef={props.screenRef}
          workspace={props.workspace}
        />
      )
      break
  }
  return <ToolRoot touch={props.touch}>{content}</ToolRoot>
}
