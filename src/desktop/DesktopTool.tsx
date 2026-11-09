import { useCallback, useEffect, useState } from 'react'
import { MonitorX } from 'lucide-react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { DesktopResponse } from '../shared/desktop'
import { ToolButton } from '../terminal/tool-parts/ToolButtons'
import { ToolRoot } from '../terminal/tool-parts/ToolRoot'
import { ToolMessage } from '../terminal/tool-parts/ToolStates'
import type { ToolError } from '../terminal/tool-parts/request'
import {
  workspaceKey,
  type ToolWorkspace,
} from '../terminal/tool-parts/workspace'
import { DesktopFrame } from './DesktopFrame'
import { loadDesktop } from './desktopApi'
import styles from './DesktopTool.module.css'

type DesktopView =
  | { state: 'loading' }
  | { state: 'error'; error: ToolError }
  | { state: 'ready'; desktop: DesktopResponse }

/** The page policy of the app blocked the frame of the stream. */
const frameBlocked: ToolError = {
  code: 'desktop_blocked',
  message: "The app's settings block this desktop.",
}

export interface DesktopToolProps {
  workspace: ToolWorkspace
  /** A phone layout: touch sizes. */
  touch: boolean
}

/** Live while the stream shows, and connecting before it does. */
function StreamStatus(props: { live: boolean }) {
  const theme = useSharedUiTheme()
  return (
    <span
      className={
        props.live ? styles.status : `${styles.status} ${styles.muted}`
      }
      role="status"
    >
      {props.live ? (
        <span aria-hidden className={styles.dot} />
      ) : (
        <span aria-hidden className={styles.spinner}>
          <Spinner color={theme.colors.muted} size={11} />
        </span>
      )}
      {props.live ? 'Live' : 'Connecting'}
    </span>
  )
}

/**
 * The Desktop tool: the live desktop of the sandbox, where the agents use a
 * browser. Each start of the tool gets a new desktop URL.
 */
export function DesktopTool(props: DesktopToolProps) {
  return <DesktopToolBody key={workspaceKey(props.workspace)} {...props} />
}

function DesktopToolBody(props: DesktopToolProps) {
  const { fetch, orgId, workspaceId } = props.workspace
  const [view, setView] = useState<DesktopView>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void loadDesktop({ fetch, orgId, workspaceId }, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return
        setView(
          result.ok
            ? { state: 'ready', desktop: result.value }
            : { state: 'error', error: result.error },
        )
      },
    )
    return () => controller.abort()
  }, [fetch, orgId, workspaceId, attempt])

  const block = useCallback(() => {
    setView({ state: 'error', error: frameBlocked })
  }, [])

  const retry = () => {
    setView({ state: 'loading' })
    setLive(false)
    setAttempt((count) => count + 1)
  }

  return (
    <ToolRoot touch={props.touch}>
      <div className={styles.toolbar}>
        {view.state === 'error' ? null : <StreamStatus live={live} />}
      </div>
      <div className={styles.stage}>
        {view.state === 'error' ? (
          <ToolMessage
            action={<ToolButton onPress={retry}>Try again</ToolButton>}
            alert
            body={view.error.message}
            icon={MonitorX}
            title="The desktop couldn't open"
          />
        ) : (
          <div className={styles.screen}>
            {view.state === 'ready' ? (
              <DesktopFrame
                desktop={view.desktop}
                onBlocked={block}
                onLoad={() => setLive(true)}
              />
            ) : null}
          </div>
        )}
      </div>
    </ToolRoot>
  )
}
