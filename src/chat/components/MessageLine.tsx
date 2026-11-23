import { useMemo, useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import { AgentBlocks } from '../../ui/components/chat/AgentBlocks'
import {
  holdsTable,
  LineBlocks,
  type LineState,
} from '../../ui/components/chat/LineBlocks'
import blockStyles from '../../ui/components/chat/LineBlocks.module.css'
import line from '../../ui/components/chat/MessageLine.module.css'
import styles from '../../ui/components/chat/ToolGroup.module.css'
import a11y from '../../ui/components/common/a11y.module.css'
import { classes } from '../../ui/components/common/classes'
import prose from '../../ui/components/common/MarkdownProse.module.css'
import { MarkedMessage } from '../explain/MarkedMessage'
import { PlainLinks } from '../../shell/ui/text-links'
import { LinksProvider, type ChatLinks } from '../links/LinksContext'
import { agentBlocks } from '../markdown/agent-blocks'
import { useAnswerReading } from '../markdown/answer-reading'
import { blockShowsText } from '../markdown/readable-text'
import { MentionsProvider } from '../mentions/MentionsContext'
import { answerDrawing } from './answer-drawing'
import { useFold } from './useFold'

/**
 * No link is a chip here, as outside a chat, so the text holds no link. The
 * hidden copy also gives no file chips, through a chat without files.
 */
const plainLinks: ChatLinks = { links: { orgId: '', workspaces: null } }

/**
 * A message of the agent in an open work fold: an icon and the first words
 * of the message on one line, cut with an ellipsis. A click grows the line
 * to the full text, with the paragraphs, headings, lists, quotes, rules,
 * and code of the message, and the line keeps its place. Another click cuts
 * it again. Closed, the line shows each line break as a space.
 *
 * The line draws its blocks with the shared `LineBlocks`, and the blocks
 * under it with the shared `AgentBlocks`. A `<summary>` holds no
 * table. So the open line keeps the blocks before the first table, or
 * before the list or the quote that holds it, as `holdsTable` says. That
 * block and the blocks after it open under the line. When the line shows no
 * readable text for the blocks that it keeps, as `blockShowsText` reads
 * them with the tree and the links of the screen, it keeps its closed text
 * as its name for a screen reader. So does a line that starts with a
 * table. The check follows the tree while the line is open, so a change of
 * the tree that gives an image the name of its file names the line with
 * it, and the hidden copy goes. That hidden copy shows no chips, and draws
 * each link as its words, so it holds no link that the keyboard can reach
 * while nobody sees it. A press on a link in the line opens the link, as on
 * a chip, and the line stays open or closed.
 *
 * The closed line shows the Markdown image of a picture file as its link,
 * so the line stays one line. The open line shows its picture, read for
 * the message with the ID `id`, the ID of its item in the transcript. A
 * press on the picture opens the file, and the line stays open. The line
 * parses the text again only when the text changes, not when it opens.
 *
 * The open line shows the marks of the explanations of the message, and
 * Explain by a selection in its text. A press on the text of a mark that
 * covers the whole message still opens or closes the line, and the state
 * of the mark opens its explanation.
 */
export function MessageLine(props: {
  id: string
  text: string
  /** The ID of the message, whose open text shows Explain and its marks. */
  messageId?: string
  /** The agent finished the message, so a selection in it shows Explain. */
  done?: boolean
}) {
  const [open, setOpen] = useState(false)
  const fold = useFold(open, setOpen)
  const { id, text } = props
  const blocks = useMemo(() => agentBlocks(text), [text])
  const drawing = useMemo(() => answerDrawing(id), [id])
  const firstTable = blocks.findIndex(holdsTable)
  const split = open && firstTable >= 0
  const lead = split ? blocks.slice(0, firstTable) : blocks
  const body = split ? blocks.slice(firstTable) : []
  // Whether the blocks that the open line keeps show no readable text, so
  // the line needs its hidden name. Their words depend on the tree and the
  // links of the screen, as for the blocks that the line draws. So the
  // check reads them as the line draws them, and runs again at each change
  // of the tree while the line is open with a table.
  const reading = useAnswerReading(split)
  const unnamed = split && !lead.some((block) => blockShowsText(block, reading))
  const state: LineState = { open, drawing }
  return (
    <MarkedMessage
      align="middle"
      done={props.done ?? false}
      folds
      messageId={props.messageId ?? ''}
      shown={open && props.messageId !== undefined}
    >
      <details
        className={classes(
          styles.message,
          blockStyles.message,
          line.message,
          prose.prose,
        )}
        {...fold.details}
      >
        <summary className={styles.messageLine} {...fold.line}>
          <MessageSquareText aria-hidden className={styles.icon} size={13} />
          <span className={styles.messageText}>
            <LineBlocks blocks={lead} state={state} />
            {unnamed ? (
              <span className={a11y.hidden} data-explain-skip>
                <LinksProvider value={plainLinks}>
                  <PlainLinks>
                    <MentionsProvider value={null}>
                      <LineBlocks
                        blocks={body}
                        state={{ open: false, drawing }}
                      />
                    </MentionsProvider>
                  </PlainLinks>
                </LinksProvider>
              </span>
            ) : null}
          </span>
        </summary>
        {split ? (
          <div className={classes(styles.messageBody, blockStyles.messageBody)}>
            <AgentBlocks blocks={body} drawing={drawing} />
          </div>
        ) : null}
      </details>
    </MarkedMessage>
  )
}
