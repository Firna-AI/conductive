import { Fragment, useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/chat/ToolGroup.module.css'
import a11y from '../../../docs/mockups/src/components/common/a11y.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import markdown from '../../../docs/mockups/src/components/files/MarkdownView.module.css'
import { AgentBlocks, InlineMarkdown } from './AgentText'
import { textBlocks, type TextBlock, type TextTable } from './agent-text'
import local from './chat.module.css'
import { useFold } from './useFold'

/** The cells of a table as text, row by row, with a dot between two cells. */
function TableText(props: { table: TextTable }) {
  const { head, rows } = props.table
  return [head, ...rows].flat().map((cell, index) => (
    <Fragment key={index}>
      {index > 0 ? ' · ' : null}
      <InlineMarkdown text={cell} />
    </Fragment>
  ))
}

/**
 * A block of a message line, as `AgentText` draws it. A `<summary>` holds
 * only phrasing content, so each block is a span, which CSS shows as a block
 * while the line is open. A code block takes the look of an answer's code
 * block only then, so the closed line shows its text in the line. Each item
 * of a numbered list writes its number, because a browser numbers a list
 * item of spans by the items of the list of the fold. A table shows as its
 * cells, so the closed line stays one line.
 */
function LineBlock(props: { block: TextBlock; open: boolean }) {
  const { block } = props
  switch (block.kind) {
    case 'p':
      return (
        <span className={classes(styles.paragraph, local.lineBlock)}>
          <InlineMarkdown text={block.text} />{' '}
        </span>
      )
    case 'ul':
      return (
        <span className={classes(styles.bullets, local.lineBlock)}>
          {block.items.map((item, index) => (
            <span className={styles.bullet} key={index}>
              <InlineMarkdown text={item} />{' '}
            </span>
          ))}
        </span>
      )
    case 'ol':
      return (
        <span
          className={classes(styles.bullets, local.lineBlock, local.numbered)}
        >
          {block.items.map((item, index) => (
            <span className={styles.bullet} key={index}>
              <span className={local.number}>{index + 1}.</span>{' '}
              <InlineMarkdown text={item} />{' '}
            </span>
          ))}
        </span>
      )
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

/**
 * A message of the agent in an open work fold: an icon and the first words
 * of the message on one line, cut with an ellipsis. A click grows the line
 * to the full text, with the paragraphs, lists, and code of the message,
 * and the line keeps its place. Another click cuts it again.
 *
 * A `<summary>` holds no table. So the open line keeps the blocks before
 * the first table, and the table and the blocks after it open under the
 * line. A line that starts with a table keeps its closed text as its name
 * for a screen reader.
 */
export function MessageLine(props: { text: string }) {
  const [open, setOpen] = useState(false)
  const fold = useFold(open, setOpen)
  const blocks = textBlocks(props.text)
  const firstTable = blocks.findIndex((block) => block.kind === 'table')
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
              <LineBlocks blocks={body} open={false} />
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
