import { useMemo } from 'react'
import { digitStyle } from '../code/CodeView'
import { classes } from '../ui/classes'
import styles from '../code/code.module.css'
import type { DiffRow } from './parse-patch'

const signs = { context: ' ', added: '+', removed: '−' } as const

const lineClass = {
  context: undefined,
  added: styles.added,
  removed: styles.removed,
} as const

function lastLine(rows: readonly DiffRow[]): number {
  let last = 0
  for (const row of rows) {
    if (row.kind === 'hunk' || row.kind === 'note') continue
    last = Math.max(last, row.oldLine ?? 0, row.newLine ?? 0)
  }
  return last
}

/** A unified diff with the old and the new line numbers. */
export function DiffView(props: { rows: readonly DiffRow[] }) {
  const { rows } = props
  const style = useMemo(() => digitStyle(lastLine(rows)), [rows])
  return (
    <div className={styles.scroll}>
      <pre className={styles.code} style={style}>
        {rows.map((row, index) => {
          if (row.kind === 'hunk' || row.kind === 'note') {
            const className = row.kind === 'hunk' ? styles.hunk : styles.note
            return (
              <div className={className} key={index}>
                {row.text}
              </div>
            )
          }
          return (
            <div
              className={classes(styles.line, lineClass[row.kind])}
              key={index}
            >
              <span className={styles.number}>{row.oldLine ?? ''}</span>
              <span className={styles.number}>{row.newLine ?? ''}</span>
              <span className={styles.sign}>{signs[row.kind]}</span>
              <span className={styles.text}>{row.text}</span>
            </div>
          )
        })}
      </pre>
    </div>
  )
}
