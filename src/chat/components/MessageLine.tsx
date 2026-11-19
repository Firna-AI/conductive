import { Fragment, useMemo, useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/chat/ToolGroup.module.css'
import a11y from '../../../docs/mockups/src/components/common/a11y.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import markdown from '../../../docs/mockups/src/components/files/MarkdownView.module.css'
import type { AnswerPictures } from '../links/FilePicture'
import { AnswerText } from '../links/LinkedText'
import { PlainLinks } from '../../shell/ui/text-links'
import { LinksProvider, type ChatLinks } from '../links/LinksContext'
import { MentionsProvider } from '../mentions/MentionsContext'
import { AgentBlocks } from './AgentText'
import {
  textBlocks,
  type TextBlock,
  type TextItem,
  type TextList,
  type TextTable,
} from './agent-text'
import local from './chat.module.css'
import { useFold } from './useFold'

/**
 * No link is a chip here, as outside a chat, so the text holds no link. The
 * hidden copy also gives no file chips, through a chat without files.
 */
const plainLinks: ChatLinks = { links: { orgId: '', workspaces: null } }

/** The cells of a table as text, row by row, with a dot between two cells. */
function TableText(props: { table: TextTable }) {
  const { head, rows } = props.table
  return [head, ...rows].flat().map((cell, index) => (
    <Fragment key={index}>
      {index > 0 ? ' · ' : null}
      <AnswerText text={cell} />
    </Fragment>
  ))
}

/**
 * The state of a message line that each of its blocks gets: whether the
 * line is open, and the pictures of its message while it is open. A closed
 * line shows each image as its link, so the line stays one line.
 */
interface LineState {
  open: boolean
  pictures?: AnswerPictures
}

const closedLine: LineState = { open: false }

/**
 * The text of a list item in a message line. An item of one paragraph shows
 * its text alone. Another item shows its blocks, such as its text and the
 * list that the agent indents under it.
 */
function LineItem(props: { item: TextItem; line: LineState }) {
  const [first] = props.item
  if (props.item.length === 1 && first.kind === 'p') {
    return (
      <>
        <AnswerText pictures={props.line.pictures} text={first.text} />{' '}
      </>
    )
  }
  return <LineBlocks blocks={props.item} line={props.line} />
}

/**
 * A list of a message line. Each item of a numbered list writes its
 * number, from the start of its list, because a browser numbers a list
 * item of spans by the items of the list of the fold.
 */
function LineList(props: { list: TextList; line: LineState }) {
  const { list } = props
  const numbered = list.kind === 'ol'
  return (
    <span
      className={classes(
        styles.bullets,
        local.lineBlock,
        numbered && styles.numbered,
      )}
    >
      {list.items.map((item, index) => (
        <span className={styles.bullet} key={index}>
          {list.kind === 'ol' ? (
            <>
              <span className={styles.number}>{list.start + index}.</span>{' '}
            </>
          ) : null}
          <LineItem item={item} line={props.line} />
        </span>
      ))}
    </span>
  )
}

/**
 * A block of a message line, as `AgentText` draws it, with the same text,
 * workspace chips, and links. A `<summary>` holds only phrasing content and
 * headings, and no paragraph, list, or table. So each block is a span,
 * which CSS shows as a block while the line is open. A code block takes the
 * look of an answer's code block only while the line is open, so the closed
 * line shows its text in the line. A table shows as its cells, so the
 * closed line stays one line. A heading is a span in the weight of a
 * heading too: the closed line stays one line, and the button role of a
 * summary hides a heading from the heading list of a screen reader. A
 * heading with no text draws nothing. In the same way as a code block, the
 * Markdown image of a picture file in a paragraph or a list item shows as
 * its picture only while the line is open.
 */
function LineBlock(props: { block: TextBlock; line: LineState }) {
  const { block, line } = props
  switch (block.kind) {
    case 'p':
      return (
        <span className={classes(styles.paragraph, local.lineBlock)}>
          <AnswerText pictures={line.pictures} text={block.text} />{' '}
        </span>
      )
    case 'heading':
      if (block.text === '') return null
      return (
        <span
          className={classes(
            styles.heading,
            local.lineBlock,
            local.lineHeading,
          )}
        >
          <AnswerText text={block.text} />{' '}
        </span>
      )
    case 'ul':
    case 'ol':
      return <LineList line={line} list={block} />
    case 'code':
      return (
        <>
          <span
            className={classes(
              local.lineBlock,
              local.code,
              line.open && markdown.block,
            )}
          >
            {block.text}
          </span>{' '}
        </>
      )
    case 'table':
      return (
        <span className={local.lineBlock}>
          <TableText table={block} />{' '}
        </span>
      )
  }
}

/** The blocks of a message line as text, in the line. */
function LineBlocks(props: { blocks: readonly TextBlock[]; line: LineState }) {
  return props.blocks.map((block, index) => (
    <LineBlock block={block} key={index} line={props.line} />
  ))
}

/** Whether a block draws nothing: a heading with no text. */
function isEmptyHeading(block: TextBlock): boolean {
  return block.kind === 'heading' && block.text === ''
}

/** Whether a block is a table, or a list with a table in an item. */
function holdsTable(block: TextBlock): boolean {
  if (block.kind === 'table') return true
  if (block.kind !== 'ul' && block.kind !== 'ol') return false
  return block.items.some((item) => item.some(holdsTable))
}

/**
 * A message of the agent in an open work fold: an icon and the first words
 * of the message on one line, cut with an ellipsis. A click grows the line
 * to the full text, with the paragraphs, headings, lists, and code of the
 * message, and the line keeps its place. Another click cuts it again.
 *
 * A `<summary>` holds no table. So the open line keeps the blocks before
 * the first table, or before the list that holds it. That block and the
 * blocks after it open under the line. A line that starts with a table, or
 * with only empty headings before it, keeps its closed text as its name for
 * a screen reader. That hidden copy shows no chips, and draws each link as
 * its words, so it holds no link that the keyboard can reach while nobody
 * sees it. A press on a link in the line opens the link, as on a chip, and
 * the line stays open or closed.
 *
 * The closed line shows the Markdown image of a picture file as its link,
 * so the line stays one line. The open line shows its picture, read for
 * the message with the ID `id`, the ID of its item in the transcript. A
 * press on the picture opens the file, and the line stays open. The line
 * parses the text again only when the text changes, not when it opens.
 */
export function MessageLine(props: { id: string; text: string }) {
  const [open, setOpen] = useState(false)
  const fold = useFold(open, setOpen)
  const { text } = props
  const blocks = useMemo(() => textBlocks(text), [text])
  const firstTable = blocks.findIndex(holdsTable)
  const split = open && firstTable >= 0
  const lead = split ? blocks.slice(0, firstTable) : blocks
  const body = split ? blocks.slice(firstTable) : []
  const line: LineState = open
    ? { open, pictures: { message: props.id } }
    : closedLine
  return (
    <details
      className={classes(styles.message, local.message)}
      {...fold.details}
    >
      <summary className={styles.messageLine} {...fold.line}>
        <MessageSquareText aria-hidden className={styles.icon} size={13} />
        <span className={styles.messageText}>
          <LineBlocks blocks={lead} line={line} />
          {split && lead.every(isEmptyHeading) ? (
            <span className={a11y.hidden}>
              <LinksProvider value={plainLinks}>
                <PlainLinks>
                  <MentionsProvider value={null}>
                    <LineBlocks blocks={body} line={closedLine} />
                  </MentionsProvider>
                </PlainLinks>
              </LinksProvider>
            </span>
          ) : null}
        </span>
      </summary>
      {split ? (
        <div className={classes(styles.messageBody, local.messageBody)}>
          <AgentBlocks blocks={body} pictures={line.pictures} />
        </div>
      ) : null}
    </details>
  )
}
