import type { CSSProperties } from 'react'
import { classes } from '../common/classes'
import { highlightLine, type TokenKind } from './highlight'
import styles from './code.module.css'

const tokenClass: Readonly<Record<TokenKind, string>> = {
  keyword: styles.keyword,
  string: styles.string,
  comment: styles.comment,
  number: styles['number-token'],
  type: styles.type,
  plain: '',
}

/** One line of code in syntax colours. */
export function CodeTokens(props: { line: string }) {
  return highlightLine(props.line).map((token, index) => (
    <span className={tokenClass[token.kind]} key={index}>
      {token.text}
    </span>
  ))
}

/** A range of lines of a file, from 1. */
export type LineRange = { first: number; last: number }

/**
 * A code file with line numbers and syntax colours. With `marked`, the
 * tab opened at a line target: the lines of the range have a background
 * colour, and the first of them sits in the middle of the view. A range
 * past the end of the file marks nothing, and the tab shows the top.
 */
export function CodeView(props: { code: string; marked?: LineRange }) {
  const lines = props.code.split('\n')
  const range =
    props.marked && props.marked.first <= lines.length
      ? props.marked
      : undefined
  const isMarked = (line: number) =>
    range !== undefined && line >= range.first && line <= range.last
  const start = range
    ? ({ '--first-line': range.first } as CSSProperties)
    : undefined
  return (
    <div
      className={classes(styles.scroll, range && styles.atLine)}
      data-mokly-scroll="file-preview"
    >
      <pre className={styles.code} style={start}>
        {lines.map((line, index) => (
          <div
            className={classes(
              styles.line,
              isMarked(index + 1) && styles.marked,
            )}
            key={index}
          >
            <span className={styles.number}>{index + 1}</span>
            <span className={styles.text}>
              <CodeTokens line={line} />
            </span>
          </div>
        ))}
      </pre>
    </div>
  )
}
