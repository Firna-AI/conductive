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

/** A code file with line numbers and syntax colours. */
export function CodeView(props: { code: string }) {
  const lines = props.code.split('\n')
  return (
    <div className={styles.scroll} data-mokly-scroll="file-preview">
      <pre className={styles.code}>
        {lines.map((line, index) => (
          <div className={styles.line} key={index}>
            <span className={styles.number}>{index + 1}</span>
            <span className={styles.text}>
              {highlightLine(line).map((token, tokenIndex) => (
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
