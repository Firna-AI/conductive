import { WebImagePart, type ImagePart } from '../chat/WebLinkText'
import inline from '../../../../../src/ui/components/common/InlineText.module.css'
import { breakItems, keptBreaks } from '../common/markdownBreaks'
import { markNodes, type MarkItem } from '../common/markdownMarks'
import { MarkedNodes } from '../common/MarkedNodes'

/** A unit of the text of a file, which its marks do not read into. */
type PreviewPart = { kind: 'code'; text: string } | ImagePart

type PreviewItem = MarkItem<PreviewPart>

/** A Markdown image, such as `![Alt text](https://example.com/a.png)`. */
const imagePattern = /!\[([^\]\n]*)\]\(([^\s()<>]+)\)/g

/** Text with each Markdown image as a unit, and its line breaks. */
function imageItems(text: string): PreviewItem[] {
  const items: PreviewItem[] = []
  let end = 0
  for (const match of text.matchAll(imagePattern)) {
    const [source, alt, href] = match
    items.push(...breakItems<PreviewPart>(text.slice(end, match.index)))
    const unit: PreviewPart = { kind: 'image', alt, href, source }
    items.push({ kind: 'unit', unit, source })
    end = match.index + source.length
  }
  return [...items, ...breakItems<PreviewPart>(text.slice(end))]
}

/** Inline code, as one unit. */
function codeItem(text: string): PreviewItem {
  return { kind: 'unit', unit: { kind: 'code', text }, source: `\`${text}\`` }
}

/** The text of a block, with each part in backticks as a unit of code. */
function previewItems(text: string): PreviewItem[] {
  return text
    .split('`')
    .flatMap((part, index) =>
      index % 2 === 1 ? [codeItem(part)] : imageItems(part),
    )
}

/**
 * Code in its code box, or an image. No picture loads from a web address,
 * so an image shows its alt text as a link to its address, as in the chat
 * (item 10 B of the Markdown plan).
 */
function PreviewUnit(props: { part: PreviewPart }) {
  const { part } = props
  if (part.kind === 'image') return <WebImagePart part={part} />
  return <code className={inline.code}>{part.text}</code>
}

/**
 * The text of a block of a Markdown file: its inline code, its images, its
 * bold text, its emphasis, its strikethrough, and its line breaks, which
 * read as they read in an answer of the chat. Other HTML shows as text.
 */
export function PreviewText(props: { text: string }) {
  return (
    <MarkedNodes
      nodes={markNodes(keptBreaks(previewItems(props.text)))}
      unit={(part) => <PreviewUnit part={part} />}
    />
  )
}
