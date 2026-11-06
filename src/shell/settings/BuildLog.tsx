import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import terminal from '../../../docs/mockups/src/components/tools/TerminalView.module.css'
import styles from '../../../docs/mockups/src/components/settings/BuildSection.module.css'
import type { ApiError } from '../../app/api/client'
import type { ComputerModel } from '../../app/computer-model'
import { asApiError, useStore } from '../../app/store'
import type { BuildLogEvent, ImageBuild } from '../../shared/org-settings'

/** The lines of a log. The events hold text that can end inside a line. */
function logLines(events: readonly BuildLogEvent[]): string[] {
  const lines = events
    .map((event) => event.text)
    .join('')
    .split('\n')
  if (lines.at(-1) === '') lines.pop()
  return lines
}

/**
 * The log of the newest build, while it runs or after it failed. A running
 * log follows the build until it ends. `error` is set when the log did not
 * load, and `retry` loads it again.
 */
export function useLatestLog(
  computer: ComputerModel,
  latest: ImageBuild | undefined,
): {
  events: readonly BuildLogEvent[]
  error: ApiError | null
  retry: () => Promise<void>
} {
  const target = latest && latest.state !== 'succeeded' ? latest : undefined
  const log = useStore(computer.log)
  const [failure, setFailure] = useState<{
    buildId: string
    error: ApiError
  } | null>(null)
  const show = (build: ImageBuild) =>
    computer.showLog(build).then(
      () => setFailure(null),
      (cause: unknown) =>
        setFailure({ buildId: build.id, error: asApiError(cause) }),
    )
  const follow = useEffectEvent(() => {
    if (target) void show(target)
  })
  // A poll changes the build object each time, so the key holds only what
  // asks for a new load: another build, or the end of the running one.
  const key = target ? `${target.id} ${target.state}` : ''
  useEffect(() => {
    follow()
  }, [key])
  return {
    events: target && log?.buildId === target.id ? log.events : [],
    error: target && failure?.buildId === target.id ? failure.error : null,
    retry: () => (target ? show(target) : Promise.resolve()),
  }
}

/**
 * A build log in the look of the terminal. It keeps the newest lines in
 * view, unless the user scrolls up. Only a running build has a cursor.
 */
export function BuildLog(props: {
  events: readonly BuildLogEvent[]
  live: boolean
}) {
  const screen = useRef<HTMLPreElement>(null)
  const atEnd = useRef(true)
  useLayoutEffect(() => {
    const node = screen.current
    if (node && atEnd.current) node.scrollTop = node.scrollHeight
  }, [props.events])
  return (
    <div className={styles.log}>
      <div className={terminal.terminal}>
        <pre
          aria-label="Build log"
          className={terminal.screen}
          onScroll={(event) => {
            const node = event.currentTarget
            const below = node.scrollHeight - node.scrollTop - node.clientHeight
            atEnd.current = below < 8
          }}
          ref={screen}
          role="log"
          tabIndex={0}
        >
          {logLines(props.events).map((line, index) => (
            <div className={terminal.line} key={index}>
              {line}
            </div>
          ))}
          {props.live ? (
            <div className={terminal.line}>
              <span aria-hidden className={terminal.cursor} />
            </div>
          ) : null}
        </pre>
      </div>
    </div>
  )
}
