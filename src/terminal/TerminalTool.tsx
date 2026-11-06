import { useEffect, useState } from 'react'
import { CircleAlert, CirclePause, Unplug } from 'lucide-react'
import type { WorkspaceState } from '../shared/workspaces'
import { ToolButton } from './tool-parts/ToolButtons'
import { ToolRoot } from './tool-parts/ToolRoot'
import { ToolMessage, ToolWaiting } from './tool-parts/ToolStates'
import type { ToolError } from './tool-parts/request'
import {
  useWorkspaceEvents,
  workspaceKey,
  type ToolWorkspace,
} from './tool-parts/workspace'
import { loadTerminal } from './terminalApi'
import {
  TerminalScreen,
  type ConnectTerminal,
  type ReadyTerminal,
} from './TerminalScreen'
import styles from './TerminalTool.module.css'

type TerminalView =
  | { state: 'loading' | 'starting' | 'stopped' }
  | { state: 'error'; error: ToolError }
  | { state: 'ready'; terminal: ReadyTerminal }

/** The workspace states in which the sandbox runs. */
const running: ReadonlySet<WorkspaceState> = new Set([
  'ready',
  'working',
  'unread',
])

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
 * terminal state, and connects only when the terminal is ready. A waiting or
 * stopped terminal reads its state again when the sandbox runs again.
 */
export function TerminalTool(props: TerminalToolProps) {
  return <TerminalToolBody key={workspaceKey(props.workspace)} {...props} />
}

function TerminalToolBody(props: TerminalToolProps) {
  const { fetch, orgId, workspaceId } = props.workspace
  const [view, setView] = useState<TerminalView>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void loadTerminal({ fetch, orgId, workspaceId }, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return
        if (!result.ok) setView({ state: 'error', error: result.error })
        else if (result.value.state === 'ready') {
          setView({ state: 'ready', terminal: result.value })
        } else setView({ state: result.value.state })
      },
    )
    return () => controller.abort()
  }, [fetch, orgId, workspaceId, attempt])

  const reload = () => {
    setView({ state: 'loading' })
    setEnded(false)
    setAttempt((count) => count + 1)
  }

  useWorkspaceEvents(props.workspace, (event) => {
    const waiting = view.state === 'starting' || view.state === 'stopped'
    if (
      waiting &&
      event.type === 'workspace.updated' &&
      running.has(event.workspace.state)
    ) {
      reload()
    }
  })

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
          action={<ToolButton onPress={reload}>Try again</ToolButton>}
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
            ended={ended}
            onClosed={() => setEnded(true)}
            onInput={props.onActivity}
            terminal={view.terminal}
          />
          {ended ? (
            <div className={styles.ended} role="status">
              <span className={styles.endedLabel}>
                <Unplug aria-hidden size={13} />
                Disconnected
              </span>
              <ToolButton onPress={reload}>Reconnect</ToolButton>
            </div>
          ) : null}
        </>
      )
      break
  }
  return <ToolRoot touch={props.touch}>{content}</ToolRoot>
}
