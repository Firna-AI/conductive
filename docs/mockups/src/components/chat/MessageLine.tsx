import { Fragment } from 'react'
import { MessageSquareText } from 'lucide-react'
import type {
  AgentBlock,
  ChatItem,
  MessageTable,
} from '../../fixtures/conversations'
import type { MessageHeading } from '../../fixtures/headingConversations'
import type { MessageList } from '../../fixtures/listConversations'
import { classes } from '../common/classes'
import markdown from '../files/MarkdownView.module.css'
import { AgentBlocks } from './AgentBlocks'
import { MessageText } from './MessageText'
import styles from './ToolGroup.module.css'

type AgentItem = Extract<ChatItem, { kind: 'agent' }>

/**
 * The blocks before the first table of a message, and the blocks from that
 * table on. A message without a table has no rest.
 */
function splitAtTable(blocks: readonly AgentBlock[]) {
  const table = blocks.findIndex(
    (block) => typeof block !== 'string' && block.kind === 'table',
  )
  const end = table < 0 ? blocks.length : table
  return { lead: blocks.slice(0, end), rest: blocks.slice(end) }
}

/** The cells of a table as text, row by row, with a dot between two cells. */
function TableText(props: { table: MessageTable }) {
  const cells = [props.table.head, ...props.table.rows].flat()
  return cells.map((cell, index) => (
    <Fragment key={index}>
      {index > 0 ? ' · ' : null}
      <MessageText answer text={cell} />
    </Fragment>
  ))
}

/**
 * A list of a message line, with the lists under its items. Each item of a
 * numbered list writes its number, because a browser numbers a list item
 * of spans by the items of the list of the fold.
 */
function LineList(props: { list: MessageList }) {
  const { list } = props
  return (
    <span className={classes(styles.bullets, list.numbered && styles.numbered)}>
      {list.items.map((item, index) => (
        <span className={styles.bullet} key={index}>
          {list.numbered ? (
            <>
              <span className={styles.number}>{index + 1}.</span>{' '}
            </>
          ) : null}
          <MessageText answer text={item.text} />{' '}
          {item.list ? <LineList list={item.list} /> : null}
        </span>
      ))}
    </span>
  )
}

/**
 * A heading of a message line, as a span in the weight of a heading. The
 * closed line shows its text in the line, so the line stays one line. The
 * open line shows it on its own line. A `<summary>`
 * may hold a heading, but its button role hides the heading from the
 * heading list of a screen reader. A heading with no text draws nothing.
 */
function LineHeading(props: { heading: MessageHeading }) {
  const { text } = props.heading
  if (text.trim() === '') return null
  return (
    <span className={styles.heading}>
      <MessageText answer text={text} />{' '}
    </span>
  )
}

/**
 * A block of a message line: a paragraph, a heading, a list, a table as
 * text, or a code block. A code block takes the look of an answer's code
 * block only while the line is open, so the closed line shows its text in
 * the line.
 */
function LineBlock(props: { block: AgentBlock; open: boolean }) {
  const { block } = props
  if (typeof block === 'string') {
    return (
      <span className={styles.paragraph}>
        <MessageText answer text={block} />{' '}
      </span>
    )
  }
  if (block.kind === 'heading') return <LineHeading heading={block} />
  if (block.kind === 'list') return <LineList list={block} />
  if (block.kind === 'code') {
    return (
      <>
        <span
          className={classes(styles.paragraph, props.open && markdown.block)}
        >
          {block.text}
        </span>{' '}
      </>
    )
  }
  return (
    <>
      <TableText table={block} />{' '}
    </>
  )
}

/**
 * A message of the agent in an open fold: an icon and the first words of
 * the message on one line, cut with an ellipsis. A click opens the line to
 * the full text, with its paragraphs, headings, lists, and tables. A list
 * shows the lists that the agent indents under its items.
 *
 * A `<summary>` holds no table, so a table never goes into the line. The
 * closed line shows the first table, and all that follows it, as text. When
 * the message opens, the line keeps the blocks before the table, and the
 * table and the rest of the message show under the line.
 */
export function MessageLine(props: { message: AgentItem; open: boolean }) {
  const { lead, rest } = splitAtTable(props.message.blocks)
  const table = rest.length > 0
  return (
    <details className={styles.message} open={props.open}>
      <summary className={styles.messageLine}>
        <MessageSquareText aria-hidden className={styles.icon} size={13} />
        <span className={styles.messageText}>
          {lead.map((block, index) => (
            <LineBlock block={block} key={index} open={props.open} />
          ))}
          {table ? (
            <span className={styles.preview}>
              {rest.map((block, index) => (
                <LineBlock block={block} key={index} open={props.open} />
              ))}
            </span>
          ) : null}
        </span>
      </summary>
      {table ? (
        <div className={styles.messageBody}>
          <AgentBlocks blocks={rest} />
        </div>
      ) : null}
    </details>
  )
}
