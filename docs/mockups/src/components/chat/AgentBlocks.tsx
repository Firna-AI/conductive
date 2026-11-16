import type { AgentBlock } from '../../fixtures/conversations'
import type { MessageHeading } from '../../fixtures/headingConversations'
import type { MessageList } from '../../fixtures/listConversations'
import { markdownTable } from '../../entries/components/common/MarkdownTable.mockup'
import { MessageText } from './MessageText'

/**
 * A heading at the level that the agent wrote, from `h1` to `h6`, with the
 * text of a paragraph. A heading with no text draws nothing, so a screen
 * reader meets no empty heading.
 */
function HeadingView(props: { heading: MessageHeading }) {
  const { level, text } = props.heading
  if (text.trim() === '') return null
  const Heading = `h${level}` as const
  return (
    <Heading>
      <MessageText strong text={text} />
    </Heading>
  )
}

/**
 * A list with the lists under its items. An item with a list keeps its own
 * text in a paragraph, and the list follows it inside the item, as the app
 * draws a Markdown list that the agent indents under an item.
 */
function ListView(props: { list: MessageList }) {
  const items = props.list.items.map((item, index) => (
    <li key={index}>
      {item.list ? (
        <>
          <p>
            <MessageText strong text={item.text} />
          </p>
          <ListView list={item.list} />
        </>
      ) : (
        <MessageText strong text={item.text} />
      )}
    </li>
  ))
  return props.list.numbered ? <ol>{items}</ol> : <ul>{items}</ul>
}

/**
 * The blocks of a message of the agent, in order: its paragraphs, its
 * headings, its tables, and its lists. Their text keeps its inline code and
 * its bold, and each link to a workspace of the org is a chip. The element
 * around them sets the type and the space between them.
 */
export function AgentBlocks(props: {
  /** The id of the message, which names its table for Mokly. */
  id: string
  blocks: readonly AgentBlock[]
}) {
  return props.blocks.map((block, index) => {
    if (typeof block === 'string') {
      return (
        <p key={index}>
          <MessageText strong text={block} />
        </p>
      )
    }
    if (block.kind === 'heading') {
      return <HeadingView heading={block} key={index} />
    }
    if (block.kind === 'list') return <ListView key={index} list={block} />
    return (
      <markdownTable.Component
        align={block.align}
        head={block.head}
        cells="message"
        key={index}
        moklyInstance={`table-${props.id}`}
        rows={block.rows}
      />
    )
  })
}
