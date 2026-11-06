import { useEffect } from 'react'
import { CircleAlert, CirclePause, Unplug } from 'lucide-react'
import { ToolButton } from './tool-parts/ToolButtons'
import { ToolRoot } from './tool-parts/ToolRoot'
import { ToolMessage, ToolWaiting } from './tool-parts/ToolStates'
import { useToolStore } from './tool-parts/useToolStore'
import { workspaceKey, type ToolWorkspace } from './tool-parts/workspace'
import { loadTerminal } from './terminalApi'
import { initialReadiness, readinessReducer } from './terminalReadiness'
import { TerminalScreen, type ConnectTerminal } from './TerminalScreen'
import styles from './TerminalTool.module.css'

export interface TerminalToolProps {
  workspace: ToolWorkspace
  connect: ConnectTerminal
  /** A phone layout: touch sizes and the key row. */
  touch: boolean
  /** The user typed in the terminal. The workspace counts it as activity. */
  onActivity?: () => void
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
  const { fetch, orgId, workspaceId } = props.workspace
  const [{ view, read }, dispatch] = useToolStore(
    readinessReducer,
    initialReadiness,
    props.workspace,
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadTerminal({ fetch, orgId, workspaceId }, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return
        dispatch({ type: 'answer', read, result })
      },
    )
    return () => controller.abort()
  }, [fetch, orgId, workspaceId, read, dispatch])

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
