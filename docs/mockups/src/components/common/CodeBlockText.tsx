import { Fragment } from 'react'
import { TokenSpans } from '../../../../../src/files/code/CodeView'
import { highlightLines } from '../../../../../src/files/code/highlight'
import {
  languageOf,
  type Language,
} from '../../../../../src/files/code/languages'

/**
 * The language of a code block of the fixtures, from the file name that
 * stands for its fence label, such as `example.rs` for a block after
 * ```rust. A block without a name, or with a name of no known language,
 * has none.
 */
export function codeLanguage(name: string | undefined): Language | null {
  return name === undefined ? null : languageOf(name)
}

/**
 * The text of a code block of a reply or of a Markdown file. With a
 * language, each line shows the colours of a file tab of that language,
 * in the token spans of the code view of the app. The line feeds stay
 * between the lines, so the block holds its text as written, and a copy
 * of the block gives that text. Without a language, the text stays plain.
 */
export function CodeBlockText(props: {
  text: string
  language: Language | null
}) {
  const { language, text } = props
  if (language === null) return text
  return highlightLines(text.split('\n'), language).map((tokens, index) => (
    <Fragment key={index}>
      {index > 0 ? '\n' : null}
      <TokenSpans tokens={tokens} />
    </Fragment>
  ))
}
