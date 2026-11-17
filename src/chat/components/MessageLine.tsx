import { useMemo, useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import line from '../../../docs/mockups/src/components/chat/MessageLine.module.css'
import styles from '../../../docs/mockups/src/components/chat/ToolGroup.module.css'
import a11y from '../../../docs/mockups/src/components/common/a11y.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import prose from '../../../docs/mockups/src/components/common/MarkdownProse.module.css'
import { PlainLinks } from '../../shell/ui/text-links'
import { LinksProvider, type ChatLinks } from '../links/LinksContext'
import { agentBlocks, type TextBlock } from '../markdown/agent-blocks'
import { MentionsProvider } from '../mentions/MentionsContext'
import { AgentBlocks } from './AgentText'
import local from './chat.module.css'
import { LineBlocks } from './LineBlocks'
import { useFold } from './useFold'

/**
 * No link is a chip here, as outside a chat, so the text holds no link. The
 * hidden copy also gives no file chips, through a chat without files.
 */
const plainLinks: ChatLinks = { links: { orgId: '', workspaces: null } }

/**
 * Whether a block is a table, or a list or a quote that holds one at any
 * depth. A quote that holds the first table of a message counts as that
 * table, as `chat-message-lines.md` says.
 */
function holdsTable(block: TextBlock): boolean {
  if (block.kind === 'table') return true
  if (block.kind === 'quote') return block.blocks.some(holdsTable)
  if (block.kind !== 'ul' && block.kind !== 'ol') return false
  return block.items.some((item) => item.some(holdsTable))
}

/**
 * A message of the agent in an open work fold: an icon and the first words
 * of the message on one line, cut with an ellipsis. A click grows the line
 * to the full text, with the paragraphs, headings, lists, quotes, rules,
 * and code of the message, and the line keeps its place. Another click cuts
 * it again. Closed, the line shows each line break as a space.
 *
 * A `<summary>` holds no table. So the open line keeps the blocks before
 * the first table, or before the list or the quote that holds it. That
 * block and the blocks after it open under the line. A line that starts
 * with a table keeps its closed text as its name for a screen reader. That
 * hidden copy shows no chips, and draws each link as its words, so it
 * holds no link that the keyboard can reach while nobody sees it. A press
 * on a link in the line opens the link, as on a chip, and the line stays
 * open or closed.
 */
export function MessageLine(props: { text: string }) {
  const [open, setOpen] = useState(false)
  const fold = useFold(open, setOpen)
  const blocks = useMemo(() => agentBlocks(props.text), [props.text])
  const firstTable = blocks.findIndex(holdsTable)
  const split = open && firstTable >= 0
  const lead = split ? blocks.slice(0, firstTable) : blocks
  const body = split ? blocks.slice(firstTable) : []
  return (
    <details
      className={classes(
        styles.message,
        local.message,
        line.message,
        prose.prose,
      )}
      {...fold.details}
    >
      <summary className={styles.messageLine} {...fold.line}>
        <MessageSquareText aria-hidden className={styles.icon} size={13} />
        <span className={styles.messageText}>
          <LineBlocks blocks={lead} open={open} />
          {split && lead.length === 0 ? (
            <span className={a11y.hidden}>
              <LinksProvider value={plainLinks}>
                <PlainLinks>
                  <MentionsProvider value={null}>
                    <LineBlocks blocks={body} open={false} />
                  </MentionsProvider>
                </PlainLinks>
              </LinksProvider>
            </span>
          ) : null}
        </span>
      </summary>
      {split ? (
        <div className={classes(styles.messageBody, local.messageBody)}>
          <AgentBlocks blocks={body} />
        </div>
      ) : null}
    </details>
  )
}
