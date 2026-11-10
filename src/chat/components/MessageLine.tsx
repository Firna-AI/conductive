import { Fragment, useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/chat/ToolGroup.module.css'
import a11y from '../../../docs/mockups/src/components/common/a11y.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import markdown from '../../../docs/mockups/src/components/files/MarkdownView.module.css'
import { LinkedText } from '../links/LinkedText'
import { LinksProvider, type ChatLinks } from '../links/LinksContext'
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

/** No link is a chip here, as outside a chat, so the text holds no link. */
const plainLinks: ChatLinks = { links: { orgId: '', workspaces: null } }

/** The cells of a table as text, row by row, with a dot between two cells. */
function TableText(props: { table: TextTable }) {
  const { head, rows } = props.table
  return [head, ...rows].flat().map((cell, index) => (
    <Fragment key={index}>
      {index > 0 ? ' · ' : null}
      <LinkedText strong text={cell} />
    </Fragment>
  ))
}

/**
 * The text of a list item in a message line. An item of one paragraph shows
 * its text alone. Another item shows its blocks, such as its text and the
 * list that the agent indents under it.
 */
function LineItem(props: { item: TextItem; open: boolean }) {
  const [first] = props.item
  if (props.item.length === 1 && first.kind === 'p') {
    return (
      <>
        <LinkedText strong text={first.text} />{' '}
      </>
    )
  }
  return <LineBlocks blocks={props.item} open={props.open} />
}

/**
 * A list of a message line. Each item of a numbered list writes its
 * number, from the start of its list, because a browser numbers a list
 * item of spans by the items of the list of the fold.
 */
function LineList(props: { list: TextList; open: boolean }) {
  const { list } = props
  const numbered = list.kind === 'ol'
  return (
    <span
      className={classes(
        styles.bullets,
        local.lineBlock,
        local.list,
        numbered && local.numbered,
      )}
    >
      {list.items.map((item, index) => (
        <span className={classes(styles.bullet, local.item)} key={index}>
          {list.kind === 'ol' ? (
            <>
              <span className={local.number}>{list.start + index}.</span>{' '}
            </>
          ) : null}
          <LineItem item={item} open={props.open} />
        </span>
      ))}
    </span>
  )
}

/**
 * A block of a message line, as `AgentText` draws it, with the same text
 * and workspace chips. A `<summary>` holds only phrasing content, so each
 * block is a span, which CSS shows as a block while the line is open. A
 * code block takes the look of an answer's code block only then, so the
 * closed line shows its text in the line. A table shows as its cells, so
 * the closed line stays one line.
 */
function LineBlock(props: { block: TextBlock; open: boolean }) {
  const { block } = props
  switch (block.kind) {
    case 'p':
      return (
        <span className={classes(styles.paragraph, local.lineBlock)}>
          <LinkedText strong text={block.text} />{' '}
        </span>
      )
    case 'ul':
    case 'ol':
      return <LineList list={block} open={props.open} />
    case 'code':
      return (
        <>
          <span
            className={classes(
              local.lineBlock,
              local.code,
              props.open && markdown.block,
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
function LineBlocks(props: { blocks: readonly TextBlock[]; open: boolean }) {
  return props.blocks.map((block, index) => (
    <LineBlock block={block} key={index} open={props.open} />
  ))
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
 * to the full text, with the paragraphs, lists, and code of the message,
 * and the line keeps its place. Another click cuts it again.
 *
 * A `<summary>` holds no table. So the open line keeps the blocks before
 * the first table, or before the list that holds it. That block and the
 * blocks after it open under the line. A line that starts with a table keeps its closed text as its name
 * for a screen reader. That hidden copy shows no chips, so it holds no link
 * that the keyboard can reach while nobody sees it.
 */
export function MessageLine(props: { text: string }) {
  const [open, setOpen] = useState(false)
  const fold = useFold(open, setOpen)
  const blocks = textBlocks(props.text)
  const firstTable = blocks.findIndex(holdsTable)
  const split = open && firstTable >= 0
  const lead = split ? blocks.slice(0, firstTable) : blocks
  const body = split ? blocks.slice(firstTable) : []
  return (
    <details
      className={classes(styles.message, local.message)}
      {...fold.details}
    >
      <summary className={styles.messageLine} {...fold.line}>
        <MessageSquareText aria-hidden className={styles.icon} size={13} />
        <span className={styles.messageText}>
          <LineBlocks blocks={lead} open={open} />
          {split && lead.length === 0 ? (
            <span className={a11y.hidden}>
              <LinksProvider value={plainLinks}>
                <LineBlocks blocks={body} open={false} />
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
