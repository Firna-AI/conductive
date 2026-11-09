import { Fragment } from 'react'
import { MessageSquareText } from 'lucide-react'
import type {
  AgentBlock,
  ChatItem,
  MessageTable,
} from '../../fixtures/conversations'
import { InlineText } from '../common/InlineText'
import { AgentBlocks } from './AgentBlocks'
import styles from './ToolGroup.module.css'

type AgentItem = Extract<ChatItem, { kind: 'agent' }>

/**
 * The paragraphs before the first table of a message, and the blocks from
 * that table on. A message without a table has no rest.
 */
function splitAtTable(blocks: readonly AgentBlock[]) {
  const table = blocks.findIndex((block) => typeof block !== 'string')
  const end = table < 0 ? blocks.length : table
  return {
    lead: blocks.slice(0, end).filter((block) => typeof block === 'string'),
    rest: blocks.slice(end),
  }
}

/** The cells of a table as text, row by row, with a dot between two cells. */
function TableText(props: { table: MessageTable }) {
  const cells = [props.table.head, ...props.table.rows].flat()
  return cells.map((cell, index) => (
    <Fragment key={index}>
      {index > 0 ? ' · ' : null}
      <InlineText text={cell} />
    </Fragment>
  ))
}

/**
 * The rest of a message with a table, as text in the closed line: each
 * block, then each bullet, with a space between them.
 */
function RestText(props: {
  blocks: readonly AgentBlock[]
  bullets?: readonly string[]
}) {
  const parts = [...props.blocks, ...(props.bullets ?? [])]
  return parts.map((part, index) => (
    <Fragment key={index}>
      {typeof part === 'string' ? (
        <InlineText text={part} />
      ) : (
        <TableText table={part} />
      )}{' '}
    </Fragment>
  ))
}

/**
 * A message of the agent in an open fold: an icon and the first words of
 * the message on one line, cut with an ellipsis. A click opens the line to
 * the full text, with its paragraphs, bullets, and tables.
 *
 * A `<summary>` holds only phrasing content, so a table never goes into the
 * line. The closed line shows the first table, and all that follows it, as
 * text. When the message opens, the line keeps the paragraphs before the
 * table, and the table and the rest of the message show under the line.
 */
export function MessageLine(props: { message: AgentItem; open: boolean }) {
  const { bullets } = props.message
  const { lead, rest } = splitAtTable(props.message.blocks)
  const table = rest.length > 0
  return (
    <details className={styles.message} open={props.open}>
      <summary className={styles.messageLine}>
        <MessageSquareText aria-hidden className={styles.icon} size={13} />
        <span className={styles.messageText}>
          {lead.map((paragraph) => (
            <span className={styles.paragraph} key={paragraph}>
              <InlineText text={paragraph} />{' '}
            </span>
          ))}
          {table ? (
            <span className={styles.preview}>
              <RestText blocks={rest} bullets={bullets} />
            </span>
          ) : null}
          {!table && bullets ? (
            <span className={styles.bullets}>
              {bullets.map((bullet) => (
                <span className={styles.bullet} key={bullet}>
                  <InlineText text={bullet} />{' '}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </summary>
      {table ? (
        <div className={styles.messageBody}>
          <AgentBlocks blocks={rest} bullets={bullets} />
        </div>
      ) : null}
    </details>
  )
}
