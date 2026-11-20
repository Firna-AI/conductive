import type { AgentBlock } from '../../fixtures/conversations'
import type { MessageHeading } from '../../fixtures/headingConversations'
import type { MessageList } from '../../fixtures/listConversations'
import prose from '../common/MarkdownProse.module.css'
import { markdownTable } from '../../entries/components/common/MarkdownTable.mockup'
import { taskText } from '../common/markdownTasks'
import { TaskBox } from '../common/TaskBox'
import { answerNodes } from './answerNodes'
import { AnswerNodes, AnswerText } from './AnswerText'
import { CodeBlock } from './CodeBlock'

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
      <AnswerText text={text} />
    </Heading>
  )
}

/**
 * A list with the lists under its items. An item with a list keeps its own
 * text in a paragraph, and the list follows it inside the item, as the app
 * draws a Markdown list that the agent indents under an item. A task item
 * shows its fixed check box in the place of its bullet (item 14 B).
 * `pictures` shows the pictures of its items.
 */
function ListView(props: { list: MessageList; pictures: boolean }) {
  const { pictures } = props
  const items = props.list.items.map((item, index) => {
    const { text, checked } = taskText(item.text)
    const box = checked === null ? null : <TaskBox checked={checked} />
    return (
      <li className={checked === null ? undefined : prose.task} key={index}>
        {item.list ? (
          <>
            <p>
              {box}
              <AnswerText pictures={pictures} text={text} />
            </p>
            <ListView list={item.list} pictures={pictures} />
          </>
        ) : (
          <>
            {box}
            <AnswerText pictures={pictures} text={text} />
          </>
        )}
      </li>
    )
  })
  return props.list.numbered ? <ol>{items}</ol> : <ul>{items}</ul>
}

/**
 * The blocks of a message of the agent, in order: its paragraphs, its
 * headings, its tables, its lists, its code blocks, its quotes, and its
 * rules. Their text keeps its inline code, its bold text, its emphasis,
 * its strikethrough, and its line breaks, and each link to a workspace of
 * the org is a chip. Each mention, and each inline code whose whole text
 * is a path of the tree, is a file chip. A code block stays code. A
 * paragraph of only line breaks draws nothing. A quote holds its own
 * blocks. The element around them sets the type and the space between
 * them, and its `prose` class gives quotes and rules their look. `live`
 * marks a message that the agent still writes: a mark that opens in its
 * last paragraph and has no pair yet closes at its end (item 9 C).
 *
 * With `pictures`, the Markdown image of a picture file in a paragraph or a
 * list item shows as its picture (screenshot decision 2), also in a quote.
 * A heading and a table cell keep its link, because a picture breaks the
 * layout of the heading or of the row.
 *
 * The blocks have no key that stays when they move, so their text stays
 * plain: the name of a Mokly instance must stay the same. A message has at
 * most one table, also in its quotes, so the id of the message names it.
 */
export function AgentBlocks(props: {
  /** The id of the message, which names its table for Mokly. */
  id: string
  blocks: readonly AgentBlock[]
  live?: boolean
  pictures?: boolean
}) {
  const pictures = props.pictures === true
  const last = props.blocks.length - 1
  return props.blocks.map((block, index) => {
    if (typeof block === 'string') {
      const nodes = answerNodes(block, props.live === true && index === last)
      if (nodes.length === 0) return null
      return (
        <p key={index}>
          <AnswerNodes nodes={nodes} pictures={pictures} />
        </p>
      )
    }
    if (block.kind === 'heading') {
      return <HeadingView heading={block} key={index} />
    }
    if (block.kind === 'list') {
      return <ListView key={index} list={block} pictures={pictures} />
    }
    if (block.kind === 'code')
      return <CodeBlock key={index} text={block.text} />
    if (block.kind === 'quote') {
      return (
        <blockquote key={index}>
          <AgentBlocks
            blocks={block.blocks}
            id={props.id}
            pictures={pictures}
          />
        </blockquote>
      )
    }
    if (block.kind === 'rule') return <hr key={index} />
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
