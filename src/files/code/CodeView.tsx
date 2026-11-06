import { useMemo, type CSSProperties } from 'react'
import { splitLines } from '../model/file-text'
import { highlightLines, type TokenKind } from './highlight'
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

/** A text file with line numbers, and syntax colours for known languages. */
export function CodeView(props: { text: string; name: string }) {
  const lines = useMemo(
    () => highlightLines(splitLines(props.text), languageOf(props.name)),
    [props.text, props.name],
  )
  return (
    <div className={styles.scroll}>
      <pre className={styles.code} style={digitStyle(lines.length)}>
        {lines.map((tokens, index) => (
          <div className={styles.line} key={index}>
            <span className={styles.number}>{index + 1}</span>
            <span className={styles.text}>
              {tokens.map((token, tokenIndex) => (
                <span className={tokenClass[token.kind]} key={tokenIndex}>
                  {token.text}
                </span>
              ))}
            </span>
          </div>
        ))}
      </pre>
    </div>
  )
}
