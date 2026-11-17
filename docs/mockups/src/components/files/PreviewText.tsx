import inline from '../common/InlineText.module.css'
import { breakItems, keptBreaks } from '../common/markdownBreaks'
import { markNodes, type MarkItem } from '../common/markdownMarks'
import { MarkedNodes } from '../common/MarkedNodes'

/** The text of a block, with each part in backticks as a unit of code. */
function previewItems(text: string): MarkItem<string>[] {
  return text
    .split('`')
    .flatMap((part, index): MarkItem<string>[] =>
      index % 2 === 1
        ? [{ kind: 'unit', unit: part, source: `\`${part}\`` }]
        : breakItems(part),
    )
}

/**
 * The text of a block of a Markdown file: its inline code, its bold text,
 * its emphasis, its strikethrough, and its line breaks, which read as they
 * read in an answer of the chat. Other HTML shows as text.
 */
export function PreviewText(props: { text: string }) {
  return (
    <MarkedNodes
      nodes={markNodes(keptBreaks(previewItems(props.text)))}
      unit={(code) => <code className={inline.code}>{code}</code>}
    />
  )
}
