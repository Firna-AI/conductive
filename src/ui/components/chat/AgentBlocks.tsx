import { memo } from 'react'
import { samePlainData } from '../../../chat/components/same-data'
import type {
  HeadingLevel,
  TextBlock,
  TextItem,
} from '../../../chat/markdown/agent-blocks'
import type { InlineText } from '../../../chat/markdown/agent-inline'
import { MarkdownItem } from '../../../markdown/MarkdownItem'
import { MarkdownTable } from '../common/MarkdownTable'
import type { AgentDrawing, TextPlace } from './agentDrawing'

/** A paragraph or a list item of an answer, where a picture can show. */
const withPictures: TextPlace = { line: false, pictures: true }

/** A heading or a table cell of an answer, which keeps the link of an image. */
const withLinks: TextPlace = { line: false, pictures: false }

/**
 * The items of a list, as `MarkdownItem` draws them in the file preview too.
 * An item of one paragraph shows its text alone. Another item shows its
 * blocks: its text, and the lists, paragraphs, headings, code blocks,
 * quotes, and tables that the agent indents under it. A task item shows its
 * fixed check box at the start of its text. The Markdown image of a picture
 * file in an item can show as its picture.
 */
function ListItems(props: {
  items: readonly TextItem[]
  drawing: AgentDrawing
}) {
  const { drawing } = props
  const text = (block: TextBlock) =>
    block.kind === 'p' ? drawing.text(block.text, withPictures) : null
  const blocks = (inner: readonly TextBlock[]) => (
    <AgentBlocks blocks={inner} drawing={drawing} />
  )
  return props.items.map((item, index) => (
    <MarkdownItem blocks={blocks} item={item} key={index} text={text} />
  ))
}

/**
 * A heading of an answer, as `h1` to `h6` at the level that the agent
 * wrote. A heading whose text shows no words where it draws, as the
 * `ShowsWords` of the view reads it, draws nothing, so a screen reader
 * meets no empty heading. It stays a block of its own, so it still ends the
 * paragraph above it. In the app, it draws once a change of the tree gives
 * it words, such as the name of the file of an image with no alt text.
 */
function AnswerHeading(props: {
  level: HeadingLevel
  text: InlineText
  drawing: AgentDrawing
}) {
  const { drawing, text } = props
  const Heading = `h${props.level}` as const
  return (
    <drawing.ShowsWords text={text}>
      <Heading>{drawing.text(text, withLinks)}</Heading>
    </drawing.ShowsWords>
  )
}

/**
 * One block of an answer. It draws again only when its data or the drawing
 * of its message change, so a live update draws only the blocks whose text
 * changed. A change of what the app reads the text with, such as the
 * workspaces, still reaches each text inside it, which reads that itself,
 * and each heading, which draws only when it shows words. A paragraph, a
 * list item, and a quote can show pictures. A heading and a table cell keep
 * the link of an image, because a picture breaks the layout of the heading
 * or of the row.
 */
const Block = memo(function Block(props: {
  block: TextBlock
  drawing: AgentDrawing
}) {
  const { block, drawing } = props
  switch (block.kind) {
    case 'p':
      return <p>{drawing.text(block.text, withPictures)}</p>
    case 'heading':
      return (
        <AnswerHeading
          drawing={drawing}
          level={block.level}
          text={block.text}
        />
      )
    case 'ul':
      return (
        <ul>
          <ListItems drawing={drawing} items={block.items} />
        </ul>
      )
    case 'ol':
      return (
        <ol start={block.start}>
          <ListItems drawing={drawing} items={block.items} />
        </ol>
      )
    case 'code':
      return drawing.code(block.text)
    case 'quote':
      return (
        <blockquote>
          <AgentBlocks blocks={block.blocks} drawing={drawing} />
        </blockquote>
      )
    case 'rule':
      return <hr />
    case 'table':
      if (drawing.table) return drawing.table(block)
      return (
        <MarkdownTable
          align={block.align}
          head={block.head}
          renderCell={(cell) => drawing.text(cell, withLinks)}
          rows={block.rows}
        />
      )
  }
}, samePlainData)

/**
 * The blocks of an agent message in order, as an answer and the body of an
 * open message line draw them: paragraphs, headings, lists, code blocks,
 * quotes, rules, and tables. The app and the mockups share them, and each
 * gives the `drawing` of its text. The element around the blocks sets the
 * type, the space between them, and the look of quotes and rules.
 */
export function AgentBlocks(props: {
  blocks: readonly TextBlock[]
  drawing: AgentDrawing
}) {
  return props.blocks.map((block, index) => (
    <Block block={block} drawing={props.drawing} key={index} />
  ))
}
