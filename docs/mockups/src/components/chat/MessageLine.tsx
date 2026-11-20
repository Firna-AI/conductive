import { Fragment } from 'react'
import { MessageSquareText } from 'lucide-react'
import type {
  AgentBlock,
  ChatItem,
  MessageTable,
} from '../../fixtures/conversations'
import type { MessageHeading } from '../../fixtures/headingConversations'
import type { MessageList } from '../../fixtures/listConversations'
import type { MessageQuote } from '../../fixtures/proseBlocks'
import { classes } from '../common/classes'
import prose from '../common/MarkdownProse.module.css'
import { taskText } from '../common/markdownTasks'
import { TaskBox } from '../common/TaskBox'
import markdown from '../files/MarkdownView.module.css'
import { agentBlocks } from '../../entries/components/chat/AgentBlocks.mockup'
import { answerNodes } from './answerNodes'
import { AnswerNodes, AnswerText } from './AnswerText'
import line from './MessageLine.module.css'
import styles from './ToolGroup.module.css'

type AgentItem = Extract<ChatItem, { kind: 'agent' }>

/** Whether a block is a table, or a quote that holds one. */
function holdsTable(block: AgentBlock): boolean {
  if (typeof block === 'string') return false
  if (block.kind === 'table') return true
  return block.kind === 'quote' && block.blocks.some(holdsTable)
}

/**
 * The blocks before the first table of a message, and the blocks from that
 * table on. A quote that holds a table counts as the table. A message
 * without a table has no rest.
 */
function splitAtTable(blocks: readonly AgentBlock[]) {
  const table = blocks.findIndex(holdsTable)
  const end = table < 0 ? blocks.length : table
  return { lead: blocks.slice(0, end), rest: blocks.slice(end) }
}

/** The cells of a table as text, row by row, with a dot between two cells. */
function TableText(props: { table: MessageTable }) {
  const cells = [props.table.head, ...props.table.rows].flat()
  return cells.map((cell, index) => (
    <Fragment key={index}>
      {index > 0 ? ' · ' : null}
      <AnswerText line text={cell} />
    </Fragment>
  ))
}

/**
 * A list of a message line, with the lists under its items. Each item of a
 * numbered list writes its number, because a browser numbers a list item
 * of spans by the items of the list of the fold. A task item shows its
 * fixed check box: closed, before its text, and open, in the place of its
 * bullet (item 14 B). An open line shows the pictures of its items.
 */
function LineList(props: { list: MessageList; open: boolean }) {
  const { list, open } = props
  return (
    <span className={classes(styles.bullets, list.numbered && styles.numbered)}>
      {list.items.map((item, index) => {
        const { text, checked } = taskText(item.text)
        return (
          <span
            className={classes(styles.bullet, checked !== null && line.task)}
            key={index}
          >
            {list.numbered ? (
              <>
                <span className={styles.number}>{index + 1}.</span>{' '}
              </>
            ) : null}
            {checked === null ? null : (
              <TaskBox
                checked={checked}
                label={checked ? 'done' : 'not done'}
              />
            )}
            <AnswerText line pictures={open} text={text} />{' '}
            {item.list ? <LineList list={item.list} open={open} /> : null}
          </span>
        )
      })}
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
      <AnswerText line text={text} />{' '}
    </span>
  )
}

/**
 * A quote of a message line, as a span with the look of a quote, because a
 * `<summary>` holds no quote element. The closed line shows its blocks as
 * text of the line, and the open line shows it as a block (design call 13).
 */
function LineQuote(props: { quote: MessageQuote; open: boolean }) {
  return (
    <>
      <span className={classes(line.quote, prose.quote)}>
        {props.quote.blocks.map((block, index) => (
          <LineBlock block={block} key={index} open={props.open} />
        ))}
      </span>{' '}
    </>
  )
}

/**
 * A block of a message line: a paragraph, a heading, a list, a table as
 * text, a code block, a quote, or a rule. A code block takes the look of an
 * answer's code block only while the line is open, so the closed line shows
 * its text in the line. In the same way, the Markdown image of a picture
 * file shows as its picture only while the line is open, and the closed
 * line shows its link (screenshot decision 2). A rule is a span with the
 * look of a rule: the closed line shows it as a middle dot, and the open
 * line as a line. A paragraph of only line breaks draws nothing.
 */
function LineBlock(props: { block: AgentBlock; open: boolean }) {
  const { block, open } = props
  if (typeof block === 'string') {
    const nodes = answerNodes(block)
    if (nodes.length === 0) return null
    return (
      <span className={styles.paragraph}>
        <AnswerNodes line nodes={nodes} pictures={open} />{' '}
      </span>
    )
  }
  if (block.kind === 'heading') return <LineHeading heading={block} />
  if (block.kind === 'list') return <LineList list={block} open={open} />
  if (block.kind === 'quote') {
    return <LineQuote open={open} quote={block} />
  }
  if (block.kind === 'rule') {
    return (
      <>
        <span className={classes(line.rule, prose.rule)} />{' '}
      </>
    )
  }
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
 * the full text, with its paragraphs, headings, lists, quotes, rules, and
 * tables. A list shows the lists that the agent indents under its items.
 *
 * A `<summary>` holds no table, so a table never goes into the line. The
 * closed line shows the first table, and all that follows it, as text. When
 * the message opens, the line keeps the blocks before the table, and the
 * table and the rest of the message show under the line. The blocks have
 * no key that stays when they move, so their text stays plain, as in
 * `AgentBlocks`.
 */
export function MessageLine(props: { message: AgentItem; open: boolean }) {
  const { lead, rest } = splitAtTable(props.message.blocks)
  const table = rest.length > 0
  return (
    <details
      className={classes(styles.message, line.message, prose.prose)}
      open={props.open}
    >
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
          <agentBlocks.Component
            blocks={rest}
            id={props.message.id}
            moklyInstance="blocks"
            pictures
          />
        </div>
      ) : null}
    </details>
  )
}
