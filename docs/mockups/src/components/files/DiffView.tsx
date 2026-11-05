import type { DiffHunkStart, DiffLine } from '../../fixtures/fileContents'
import styles from './code.module.css'

type Hunk = { start: DiffHunkStart; lines: readonly DiffLine[] }

const signs = { context: ' ', added: '+', removed: '−' } as const

const lineClass = {
  context: '',
  added: styles.added,
  removed: styles.removed,
} as const

/** A unified diff with old and new line numbers. */
export function DiffView(props: { hunks: readonly Hunk[] }) {
  const rows = props.hunks.flatMap((hunk) => {
    let oldLine = hunk.start.old
    let newLine = hunk.start.new
    return hunk.lines.map((line) => {
      if (line.kind === 'hunk') return { line, old: '', new: '' }
      const old = line.kind === 'added' ? '' : String(oldLine++)
      const next = line.kind === 'removed' ? '' : String(newLine++)
      return { line, old, new: next }
    })
  })
  return (
    <div className={styles.scroll} data-mokly-scroll="file-preview">
      <pre className={styles.code}>
        {rows.map((row, index) =>
          row.line.kind === 'hunk' ? (
            <div className={styles.hunk} key={index}>
              {row.line.text}
            </div>
          ) : (
            <div
              className={`${styles.line} ${lineClass[row.line.kind]}`}
              key={index}
            >
              <span className={styles.number}>{row.old}</span>
              <span className={styles.number}>{row.new}</span>
              <span className={styles.sign}>{signs[row.line.kind]}</span>
              <span className={styles.text}>{row.line.text}</span>
            </div>
          ),
        )}
      </pre>
    </div>
  )
}
