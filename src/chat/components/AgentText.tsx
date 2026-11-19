import { useMemo } from 'react'
import itemStyles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import headingStyles from '../../../docs/mockups/src/components/common/MarkdownHeadings.module.css'
import { MarkdownTable } from '../../../docs/mockups/src/components/common/MarkdownTable'
import type { AnswerPictures } from '../links/FilePicture'
import { AnswerText } from '../links/LinkedText'
import { textBlocks, type TextBlock, type TextItem } from './agent-text'
import { CodeBlock } from './CodeBlock'

/** A cell of a table in an answer, with the formatting of a paragraph. */
function tableCell(text: string) {
  return <AnswerText text={text} />
}

/**
 * The items of a list. An item of one paragraph shows its text alone, as in
 * the file preview. Another item shows its blocks: its text, and the lists,
 * paragraphs, headings, code blocks, and tables that the agent indents
 * under it.
 */
function ListItems(props: {
  items: readonly TextItem[]
  pictures?: AnswerPictures
}) {
  const { pictures } = props
  return props.items.map((item, index) => {
    const [first] = item
    const tight = item.length === 1 && first.kind === 'p'
    return (
      <li key={index}>
        {tight ? (
          <AnswerText pictures={pictures} text={first.text} />
        ) : (
          <AgentBlocks blocks={item} pictures={pictures} />
        )}
      </li>
    )
  })
}

/**
 * One block of an answer. Only a paragraph and a list item get `pictures`:
 * a heading and a table cell keep the link of an image, because a picture
 * breaks the layout of the heading or of the row.
 */
function Block(props: { block: TextBlock; pictures?: AnswerPictures }) {
  const { block, pictures } = props
  switch (block.kind) {
    case 'p':
      return (
        <p>
          <AnswerText pictures={pictures} text={block.text} />
        </p>
      )
    case 'heading': {
      // A heading with no text draws nothing, so a screen reader meets no
      // empty heading.
      if (block.text === '') return null
      const Heading = `h${block.level}` as const
      return (
        <Heading>
          <AnswerText text={block.text} />
        </Heading>
      )
    }
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
}

/**
 * The blocks of an answer in order, as `AgentText` and an open message line
 * draw them. The element around them sets the type and the space between.
 * With `pictures`, the Markdown image of a picture file in a paragraph or a
 * list item shows as its picture.
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
 * An answer of the agent: paragraphs, headings, lists, code, and tables, as
 * it writes them. A heading is `h1` to `h6`, at the level that the agent
 * wrote, and its look comes from the heading style that the file preview
 * shares. A list item holds the blocks that the agent indents under it. The
 * text of a paragraph, a heading, a list item, or a table cell has `code`
 * and **strong** parts, as `chatParts` reads it. Each workspace link outside
 * code is a chip, and so is a Markdown link to a workspace, also with a bold
 * or code label. The Markdown image of a picture file in a paragraph or a
 * list item shows as its picture, read for the message with the ID `id`,
 * the ID of its item in the transcript. It parses the text again only when
 * the text changes.
 */
export function AgentText(props: { id: string; text: string }) {
  const { id, text } = props
  const blocks = useMemo(() => textBlocks(text), [text])
  const pictures = useMemo(() => ({ message: id }), [id])
  return (
    <div className={classes(itemStyles.agent, headingStyles.headings)}>
      <AgentBlocks blocks={blocks} pictures={pictures} />
    </div>
  )
}
