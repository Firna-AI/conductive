import { Fragment, memo, useMemo } from 'react'
import { TokenSpans } from './CodeView'
import { fenceLines } from './fence-lines'
import type { Token } from './highlight'

/** Whether two lines hold the same tokens, kind for kind and text for text. */
function sameTokens(
  before: { tokens: readonly Token[] },
  after: { tokens: readonly Token[] },
): boolean {
  const old = before.tokens
  const next = after.tokens
  return (
    old.length === next.length &&
    old.every(
      (token, index) =>
        token.kind === next[index]?.kind && token.text === next[index]?.text,
    )
  )
}

/**
 * One coloured line of a code block. A new colouring of the whole block
 * gives each line new tokens, so the line compares their content, and draws
 * again only when they change. A block that the agent still writes then
 * draws again only its changed lines, such as its last one.
 */
const CodeLine = memo(function CodeLine(props: { tokens: readonly Token[] }) {
  return <TokenSpans tokens={props.tokens} />
}, sameTokens)

/**
 * The text of a code block, inside the one `<pre>` of the caller. With
 * `lines`, the coloured tokens of each line of `text`, each line shows the
 * spans of a file tab, with a line feed between two lines. The spans are
 * inline and the line feeds stay text, so the text of the `<pre>` stays
 * `text`, with its tabs and blank lines: a copy of the block and Explain
 * read the code as written, and no line is an element of its own. Without
 * `lines`, the block shows the plain text.
 */
export function CodeText(props: {
  text: string
  lines: readonly (readonly Token[])[] | null
}) {
  const { lines, text } = props
  if (lines === null) return text
  return lines.map((tokens, index) => (
    <Fragment key={index}>
      {index > 0 ? '\n' : null}
      <CodeLine tokens={tokens} />
    </Fragment>
  ))
}

/**
 * The text of a code block in the colours of its fence label, as a file
 * tab of that language shows it, or plain when the label names no
 * language, as `fenceLines` reads it. It colours the text again only when
 * the text or the label changes. The chat and the mockups draw their code
 * blocks with it. The file preview gets its lines from its worker, and
 * draws them with `CodeText`.
 */
export function FenceText(props: { text: string; label: string | null }) {
  const { label, text } = props
  const lines = useMemo(() => fenceLines(text, label), [text, label])
  return <CodeText lines={lines} text={text} />
}
