import { memo, useMemo } from 'react'
import itemStyles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import headingStyles from '../../../docs/mockups/src/components/common/MarkdownHeadings.module.css'
import prose from '../../../docs/mockups/src/components/common/MarkdownProse.module.css'
import { MarkdownTable } from '../../../docs/mockups/src/components/common/MarkdownTable'
import { MarkdownItem } from '../../markdown/MarkdownItem'
import type { AnswerPictures } from '../links/FilePicture'
import {
  agentBlocks,
  type HeadingLevel,
  type TextBlock,
  type TextItem,
} from '../markdown/agent-blocks'
import type { InlineText } from '../markdown/agent-inline'
import { useShowsWords } from '../markdown/answer-reading'
import { AnswerText } from '../markdown/AnswerText'
import { CodeBlock } from './CodeBlock'
import { samePlainData } from './same-data'

/**
 * A cell of a table in an answer, with the formatting of a paragraph. A
 * cell keeps the link of an image, because a picture breaks the row.
 */
function tableCell(text: InlineText) {
  return <AnswerText text={text} />
}

/**
 * The items of a list, as `MarkdownItem` draws them in the file preview too.
 * An item of one paragraph shows its text alone. Another item shows its
 * blocks: its text, and the lists, paragraphs, headings, code blocks,
 * quotes, and tables that the agent indents under it. A task item shows its
 * fixed check box at the start of its text. With `pictures`, the Markdown
 * image of a picture file in an item shows as its picture.
 */
function ListItems(props: {
  items: readonly TextItem[]
  pictures?: AnswerPictures
}) {
  const { pictures } = props
  const text = (block: TextBlock) =>
    block.kind === 'p' ? (
      <AnswerText pictures={pictures} text={block.text} />
    ) : null
  const blocks = (inner: readonly TextBlock[]) => (
    <AgentBlocks blocks={inner} pictures={pictures} />
  )
  return props.items.map((item, index) => (
    <MarkdownItem blocks={blocks} item={item} key={index} text={text} />
  ))
}

/**
 * A heading of an answer, as `h1` to `h6` at the level that the agent
 * wrote, with its text through `AnswerText`. A heading whose text shows no
 * words where it draws, as `useShowsWords` reads it with the tree and the
 * links of the screen, draws nothing, so a screen reader meets no empty
 * heading. It stays a block of its own, so it still ends the paragraph
 * above it. It draws once a change of the tree gives it words, such as the
 * name of the file of an image with no alt text.
 */
function AnswerHeading(props: { level: HeadingLevel; text: InlineText }) {
  const shows = useShowsWords(props.text)
  if (!shows) return null
  const Heading = `h${props.level}` as const
  return (
    <Heading>
      <AnswerText text={props.text} />
    </Heading>
  )
}

/**
 * One block of an answer. It draws again only when its data or the
 * pictures of its message change, so a live update draws only the blocks
 * whose text changed. A change of what the chat reads the text with, such
 * as the workspaces, still reaches each `AnswerText` inside it, which reads
 * that itself, and each heading, which draws only when it shows words. A
 * paragraph, a list item, and a quote get `pictures`. A heading and a
 * table cell keep the link of an image, because a picture breaks the
 * layout of the heading or of the row.
 */
const Block = memo(function Block(props: {
  block: TextBlock
  pictures?: AnswerPictures
}) {
  const { block, pictures } = props
  switch (block.kind) {
    case 'p':
      return (
        <p>
          <AnswerText pictures={pictures} text={block.text} />
        </p>
      )
    case 'heading':
      return <AnswerHeading level={block.level} text={block.text} />
    case 'ul':
      return (
        <ul>
          <ListItems items={block.items} pictures={pictures} />
        </ul>
      )
    case 'ol':
      return (
        <ol start={block.start}>
          <ListItems items={block.items} pictures={pictures} />
        </ol>
      )
    case 'code':
      return <CodeBlock text={block.text} />
    case 'quote':
      return (
        <blockquote>
          <AgentBlocks blocks={block.blocks} pictures={pictures} />
        </blockquote>
      )
    case 'rule':
      return <hr />
    case 'table':
      return (
        <MarkdownTable
          align={block.align}
          head={block.head}
          renderCell={tableCell}
          rows={block.rows}
        />
      )
  }
}, samePlainData)

/**
 * The blocks of an answer in order, as `AgentText` and an open message line
 * draw them. The element around them sets the type, the space between, and
 * the look of quotes and rules. With `pictures`, the Markdown image of a
 * picture file in a paragraph or a list item shows as its picture.
 */
export function AgentBlocks(props: {
  blocks: readonly TextBlock[]
  pictures?: AnswerPictures
}) {
  return props.blocks.map((block, index) => (
    <Block block={block} key={index} pictures={props.pictures} />
  ))
}

/**
 * An answer of the agent: paragraphs, headings, lists, code, quotes, rules,
 * and tables, as `agentBlocks` reads them with the shared Markdown parser.
 * A heading is `h1` to `h6`, at the level that the agent wrote, and its
 * look comes from the heading style that the file preview shares. Quotes,
 * rules, bold text, emphasis, strikethrough, and task boxes take the look
 * of the shared `MarkdownProse.module.css`. A list item holds the blocks
 * that the agent indents under it. The text of each block draws through
 * `AnswerText`. The Markdown image of a picture file in a paragraph or a
 * list item shows as its picture, read for the message with the ID `id`,
 * the ID of its item in the transcript. `live` marks an answer that the
 * agent still writes, whose open marks close at the end of its text.
 *
 * Each update of a live answer reads the whole text again, and draws again
 * only the blocks whose data changed. An answer whose ID, text, and `live`
 * stay the same draws nothing again.
 */
export const AgentText = memo(function AgentText(props: {
  id: string
  text: string
  live?: boolean
}) {
  const { id, text } = props
  const live = props.live === true
  const blocks = useMemo(() => agentBlocks(text, live), [text, live])
  const pictures = useMemo(() => ({ message: id }), [id])
  return (
    <div
      className={classes(itemStyles.agent, headingStyles.headings, prose.prose)}
    >
      <AgentBlocks blocks={blocks} pictures={pictures} />
    </div>
  )
})
