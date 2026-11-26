import { MessageSquareText } from 'lucide-react'
import { agentBlocks } from '../../entries/components/chat/AgentBlocks.mockup'
import type { ChatItem } from '../../fixtures/conversations'
import { classes } from '../../../../../src/ui/components/common/classes'
import prose from '../../../../../src/ui/components/common/MarkdownProse.module.css'
import { fixtureDrawing } from './fixtureDrawing'
import {
  holdsTable,
  LineBlocks,
  type LineState,
} from '../../../../../src/ui/components/chat/LineBlocks'
import blockStyles from '../../../../../src/ui/components/chat/LineBlocks.module.css'
import line from '../../../../../src/ui/components/chat/MessageLine.module.css'
import styles from '../../../../../src/ui/components/chat/ToolGroup.module.css'

type AgentItem = Extract<ChatItem, { kind: 'agent' }>

/**
 * A message of the agent in an open fold: an icon and the first words of
 * the message on one line, cut with an ellipsis. A click opens the line to
 * the full text, with its paragraphs, headings, lists, quotes, rules,
 * tables, and code. A list shows the lists that the agent indents under
 * its items. The line draws its blocks with `LineBlocks`, and the blocks
 * under it with `AgentBlocks`, which the app uses too.
 *
 * A `<summary>` holds no table, so a table never goes into the line. The
 * closed line shows the first table, or the list or the quote that holds
 * it, and all that follows it, as text, as `holdsTable` says. When the
 * message opens, the line keeps the blocks before the table, and the table
 * and the rest of the message show under the line.
 */
export function MessageLine(props: { message: AgentItem; open: boolean }) {
  const { blocks } = props.message
  const table = blocks.findIndex(holdsTable)
  const lead = table < 0 ? blocks : blocks.slice(0, table)
  const rest = table < 0 ? [] : blocks.slice(table)
  const state: LineState = { open: props.open, drawing: fixtureDrawing }
  return (
    <details
      className={classes(
        styles.message,
        blockStyles.message,
        line.message,
        prose.prose,
      )}
      open={props.open}
    >
      <summary className={styles.messageLine}>
        <MessageSquareText aria-hidden className={styles.icon} size={13} />
        <span className={styles.messageText}>
          <LineBlocks blocks={lead} state={state} />
          {rest.length > 0 ? (
            <span className={styles.preview}>
              <LineBlocks blocks={rest} state={state} />
            </span>
          ) : null}
        </span>
      </summary>
      {rest.length > 0 ? (
        <div className={classes(styles.messageBody, blockStyles.messageBody)}>
          <agentBlocks.Component
            blocks={rest}
            id={props.message.id}
            moklyInstance="blocks"
          />
        </div>
      ) : null}
    </details>
  )
}
