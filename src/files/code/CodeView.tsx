import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import type { LineRange } from '../../shared/line-target'
import { splitLines } from '../model/file-text'
import { highlightLines, type Token, type TokenKind } from './highlight'
import { languageOf } from './languages'
import styles from './code.module.css'

const tokenClass: Readonly<Record<TokenKind, string | undefined>> = {
  keyword: styles.keyword,
  string: styles.string,
  comment: styles.comment,
  number: styles['number-token'],
  type: styles.type,
  plain: undefined,
}

type DigitStyle = CSSProperties & { '--number-digits': string }

/** Makes the line numbers wide enough for the digits of the last line. */
export function digitStyle(lastLine: number): DigitStyle {
  return { '--number-digits': String(String(lastLine).length) }
}

/** The coloured tokens of one line. */
export function TokenSpans(props: { tokens: readonly Token[] }) {
  return props.tokens.map((token, index) => (
    <span className={tokenClass[token.kind]} key={index}>
      {token.text}
    </span>
  ))
}

/**
 * The lines of `marked` that the file holds, or null when the first one is
 * past the end of the file. A range that runs past the end stops there.
 */
function shownLines(
  marked: LineRange | null | undefined,
  count: number,
): LineRange | null {
  if (!marked || marked.start > count) return null
  return { start: marked.start, end: Math.min(marked.end, count) }
}

/**
 * A text file with line numbers, and syntax colours for known languages.
 * With `marked`, the view scrolls the first marked line to its middle, and
 * marks each line of the range with a background colour. A new range
 * scrolls again.
 */
export function CodeView(props: {
  text: string
  name: string
  marked?: LineRange | null
}) {
  const lines = useMemo(
    () => highlightLines(splitLines(props.text), languageOf(props.name)),
    [props.text, props.name],
  )
  const marked = shownLines(props.marked, lines.length)
  const start = marked?.start ?? null
  const end = marked?.end ?? null
  const scroll = useRef<HTMLDivElement>(null)
  const first = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const view = scroll.current
    const line = first.current
    if (start === null || !view || !line) return
    const top =
      line.getBoundingClientRect().top - view.getBoundingClientRect().top
    view.scrollTop += top - (view.clientHeight - line.offsetHeight) / 2
  }, [start, end, lines])
  const isMarked = (number: number) =>
    start !== null && end !== null && number >= start && number <= end
  return (
    <div className={styles.scroll} ref={scroll}>
      <pre className={styles.code} style={digitStyle(lines.length)}>
        {lines.map((tokens, index) => (
          <div
            className={
              isMarked(index + 1)
                ? `${styles.line} ${styles.marked}`
                : styles.line
            }
            data-marked={isMarked(index + 1) ? '' : undefined}
            key={index}
            ref={index + 1 === start ? first : undefined}
          >
            <span className={styles.number}>{index + 1}</span>
            <span className={styles.text}>
              <TokenSpans tokens={tokens} />
            </span>
          </div>
        ))}
      </pre>
    </div>
  )
}
