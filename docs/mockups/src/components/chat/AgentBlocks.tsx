import type { ReactNode } from 'react'
import type { AgentBlock } from '../../fixtures/conversations'
import type { MessageHeading } from '../../fixtures/headingConversations'
import type { MessageList } from '../../fixtures/listConversations'
import { MarkdownTable } from '../common/MarkdownTable'
import { CodeBlock } from './CodeBlock'
import { MessageText } from './MessageText'

/**
 * How the blocks draw a text of the message: the text of a paragraph, with
 * its bold, code, and chips. A chat can draw more over it, such as marks.
 */
type TextOf = (text: string) => ReactNode

/** The text of a paragraph, a heading, a list item, or a table cell. */
function answerText(text: string) {
  return <MessageText answer text={text} />
}

/**
 * A heading at the level that the agent wrote, from `h1` to `h6`, with the
 * text of a paragraph. A heading with no text draws nothing, so a screen
 * reader meets no empty heading.
 */
function HeadingView(props: { heading: MessageHeading; text: TextOf }) {
  const { level, text } = props.heading
  if (text.trim() === '') return null
  const Heading = `h${level}` as const
  return <Heading>{props.text(text)}</Heading>
}

/**
 * A list with the lists under its items. An item with a list keeps its own
 * text in a paragraph, and the list follows it inside the item, as the app
 * draws a Markdown list that the agent indents under an item.
 */
function ListView(props: { list: MessageList; text: TextOf }) {
  const items = props.list.items.map((item, index) => (
    <li key={index}>
      {item.list ? (
        <>
          <p>{props.text(item.text)}</p>
          <ListView list={item.list} text={props.text} />
        </>
      ) : (
        props.text(item.text)
      )}
    </li>
  ))
  return props.list.numbered ? <ol>{items}</ol> : <ul>{items}</ul>
}

/**
 * The blocks of a message of the agent, in order: its paragraphs, its
 * headings, its tables, its lists, and its code blocks. Their text keeps its
 * inline code and its bold, and each link to a workspace of the org is a
 * chip. Each mention, and each inline code whose whole text is a path of
 * the tree, is a file chip. A code block stays code. The element around
 * them sets the type and the space between them. `text` draws each text,
 * such as with the marks of side questions in the chat.
 */
export function AgentBlocks(props: {
  blocks: readonly AgentBlock[]
  text?: TextOf
}) {
  const text = props.text ?? answerText
  return props.blocks.map((block, index) => {
    if (typeof block === 'string') return <p key={index}>{text(block)}</p>
    if (block.kind === 'heading') {
      return <HeadingView heading={block} key={index} text={text} />
    }
    if (block.kind === 'list') {
      return <ListView key={index} list={block} text={text} />
    }
    if (block.kind === 'code')
      return <CodeBlock key={index} text={block.text} />
    return (
      <MarkdownTable
        align={block.align}
        head={block.head}
        key={index}
        renderCell={text}
        rows={block.rows}
      />
    )
  })
}
