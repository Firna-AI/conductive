import type { CSSProperties } from 'react'
import { highlightLines } from '../../../../../src/files/code/highlight'
import { languageOf } from '../../../../../src/files/code/languages'
import { splitPath } from '../../fixtures/files'
import { classes } from '../../../../../src/ui/components/common/classes'
import { highlightLine, type Token, type TokenKind } from './highlight'
import styles from './code.module.css'

const tokenClass: Readonly<Record<TokenKind, string>> = {
  keyword: styles.keyword,
  string: styles.string,
  comment: styles.comment,
  number: styles['number-token'],
  type: styles.type,
  plain: '',
}

/** The coloured tokens of one line. */
function Tokens(props: { tokens: readonly Token[] }) {
  return props.tokens.map((token, index) => (
    <span className={tokenClass[token.kind]} key={index}>
      {token.text}
    </span>
  ))
}

/** One line of code in syntax colours. */
export function CodeTokens(props: { line: string }) {
  return <Tokens tokens={highlightLine(props.line)} />
}

/**
 * The tokens of each line. With the path of the file, the lines take the
 * colours that the code view of the app gives the language of its name,
 * such as HTML. Without it, the small TypeScript highlighter of the
 * mockups colours each line.
 */
function tokensOf(lines: readonly string[], path?: string): Token[][] {
  if (path === undefined) return lines.map(highlightLine)
  return highlightLines(lines, languageOf(splitPath(path).name))
}

/** A range of lines of a file, from 1. */
export type LineRange = { first: number; last: number }

/**
 * A code file with line numbers and syntax colours. With `marked`, the
 * tab opened at a line target: the lines of the range have a background
 * colour, and the first of them sits in the middle of the view. A range
 * past the end of the file marks nothing, and the tab shows the top.
 * `path` gives the colours of the language of the file, as `tokensOf` says.
 */
export function CodeView(props: {
  code: string
  marked?: LineRange
  path?: string
}) {
  const lines = props.code.split('\n')
  const tokens = tokensOf(lines, props.path)
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
        {tokens.map((line, index) => (
          <div
            className={classes(
              styles.line,
              isMarked(index + 1) && styles.marked,
            )}
            key={index}
          >
            <span className={styles.number}>{index + 1}</span>
            <span className={styles.text}>
              <Tokens tokens={line} />
            </span>
          </div>
        ))}
      </pre>
    </div>
  )
}
