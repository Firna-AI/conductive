import { useMemo } from 'react'
import { digitStyle, LineText } from '../code/CodeView'
import { languageOf } from '../code/languages'
import { classes } from '../ui/classes'
import { useKeptScroll } from '../ui/kept-scroll'
import { CodeBox } from '../code/CodeBox'
import styles from '../code/code.module.css'
import { highlightDiff } from './highlight-diff'
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

/**
 * A unified diff with the old and the new line numbers, and syntax colours
 * for the language of `name`. The whole old and new files, when present,
 * give the colours of lines inside a comment or a string that opens above
 * a hunk. A diff tab keeps its scroll offset.
 */
export function DiffView(props: {
  rows: readonly DiffRow[]
  name: string
  oldContent: string | null
  newContent: string | null
}) {
  const { rows, name, oldContent, newContent } = props
  const box = useKeptScroll('diff')
  const style = useMemo(() => digitStyle(lastLine(rows)), [rows])
  const tokens = useMemo(
    () => highlightDiff(rows, languageOf(name), oldContent, newContent),
    [rows, name, oldContent, newContent],
  )
  return (
    <CodeBox ref={box} label="Diff">
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
              <LineText
                tokens={tokens?.[index] ?? [{ kind: 'plain', text: row.text }]}
              />
            </div>
          )
        })}
      </pre>
    </CodeBox>
  )
}
