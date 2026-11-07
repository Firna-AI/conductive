import { useLayoutEffect, useRef } from 'react'
import terminal from '../../../docs/mockups/src/components/tools/TerminalView.module.css'
import styles from '../../../docs/mockups/src/components/settings/BuildSection.module.css'
import type { BuildLogEvent } from '../../shared/org-settings'

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
