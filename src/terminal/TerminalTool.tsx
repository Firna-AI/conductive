import { useCallback, type Ref } from 'react'
import { CircleAlert, CirclePause, Unplug } from 'lucide-react'
import { useWorkspaceStore } from '../app/workspace-store'
import { ToolButton } from './tool-parts/ToolButtons'
import { ToolRoot } from './tool-parts/ToolRoot'
import { ToolMessage, ToolWaiting } from './tool-parts/ToolStates'
import { workspaceKey, type ToolWorkspace } from './tool-parts/workspace'
import { createTerminalStore, type TerminalStore } from './terminalStore'
import { TerminalScreen, type ConnectTerminal } from './TerminalScreen'
import styles from './TerminalTool.module.css'

export interface TerminalToolProps {
  workspace: ToolWorkspace
  connect: ConnectTerminal
  /** A phone layout: touch sizes and the key row. */
  touch: boolean
  /** The user typed in the terminal. The workspace counts it as activity. */
  onActivity?: () => void
  /**
   * The element of the xterm.js screen, where a shell reads the keys. The
   * owner marks it, so the buttons of the tool keep no key.
   */
  screenRef?: Ref<HTMLDivElement>
}

/**
 * The Terminal tool: a shell in the sandbox of the workspace. It reads the
 * terminal state, and connects only when the terminal is ready. A running
 * sandbox makes a waiting or loading terminal read its state again.
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
        <>
          <TerminalScreen
            connect={props.connect}
            ended={view.ended}
            onClosed={() => dispatch({ type: 'ended' })}
            onInput={props.onActivity}
            screenRef={props.screenRef}
            terminal={view.terminal}
          />
          {view.ended ? (
            <div className={styles.ended} role="status">
              <span className={styles.endedLabel}>
                <Unplug aria-hidden size={13} />
                Disconnected
              </span>
              <ToolButton onPress={retry}>Reconnect</ToolButton>
            </div>
          ) : null}
        </>
      )
      break
  }
  return <ToolRoot touch={props.touch}>{content}</ToolRoot>
}
