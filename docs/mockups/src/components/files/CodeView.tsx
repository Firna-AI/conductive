import {
  markedParts,
  markedTokens,
  MatchMark,
  useFind,
} from '../find/findMarks'
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

/**
 * One line of code in syntax colours. An open find bar colours its matches
 * over the colours of the tokens, so a match can cross tokens of the line.
 */
export function CodeTokens(props: { line: string }) {
  const parts = markedParts(props.line, useFind())
  return markedTokens(highlightLine(props.line), parts).map((piece, index) => (
    <span className={tokenClass[piece.kind]} key={index}>
      {piece.mark ? (
        <MatchMark mark={piece.mark}>{piece.text}</MatchMark>
      ) : (
        piece.text
      )}
    </span>
  ))
}

/**
 * A code file with line numbers and syntax colours. The find bar never
 * matches a line number.
 */
export function CodeView(props: { code: string }) {
  const lines = props.code.split('\n')
  return (
    <div className={styles.scroll} data-mokly-scroll="file-preview">
      <pre className={styles.code}>
        {lines.map((line, index) => (
          <div className={styles.line} key={index}>
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
