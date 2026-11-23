import type { ReactNode } from 'react'
import { CircleStop } from 'lucide-react'
import { stoppedFrom } from './stopCopy'
import styles from './StopLine.module.css'

/**
 * Who stopped a turn, as its line names it: the words of a Stop that a
 * member pressed or of a stop without one, or the chip of the session whose
 * agent stopped the turn with a workspace tool.
 */
export type StopSource =
  { kind: 'words'; text: string } | { kind: 'session'; chip: ReactNode }

/**
 * The line of a stopped turn: the stop icon, who stopped the turn, then
 * each note of the turn after a dot, such as "5 changed files not listed".
 * A stop from a session shows "Stopped from" and the chip of that session.
 * The chat centres the line, as its other event lines. A narrow chat wraps
 * it into balanced lines, and the chip moves to the next line whole. It
 * takes no fixtures, so the app can use it too.
 */
export function StopLine(props: {
  source: StopSource
  notes: readonly string[]
}) {
  const { source } = props
  return (
    <p className={styles.line}>
      <CircleStop aria-hidden className={styles.icon} size={13} />
      <span>
        {source.kind === 'words' ? (
          source.text
        ) : (
          <>
            {stoppedFrom} {source.chip}
          </>
        )}
        {props.notes.map((note) => ` · ${note}`).join('')}
      </span>
    </p>
  )
}
