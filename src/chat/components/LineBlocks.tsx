import { Fragment } from 'react'
import line from '../../../docs/mockups/src/components/chat/MessageLine.module.css'
import styles from '../../../docs/mockups/src/components/chat/ToolGroup.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import prose from '../../../docs/mockups/src/components/common/MarkdownProse.module.css'
import markdown from '../../../docs/mockups/src/components/files/MarkdownView.module.css'
import type {
  TextBlock,
  TextItem,
  TextList,
  TextTable,
} from '../markdown/agent-blocks'
import { AnswerText } from '../markdown/AnswerText'
import local from './chat.module.css'

/** The cells of a table as text, row by row, with a dot between two cells. */
function TableText(props: { table: TextTable }) {
  const { head, rows } = props.table
  return [head, ...rows].flat().map((cell, index) => (
    <Fragment key={index}>
      {index > 0 ? ' · ' : null}
      <AnswerText line text={cell} />
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
        <AnswerText line text={first.text} />{' '}
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
          <LineItem item={item} open={props.open} />
        </span>
      ))}
    </span>
  )
}

/**
 * A block of a message line, as `AgentText` draws it, with the same text,
 * workspace chips, and links. A `<summary>` holds only phrasing content and
 * headings, and no paragraph, list, quote, rule, or table. So each block is
 * a span, which CSS shows as a block while the line is open. A code block
 * takes the look of an answer's code block only while the line is open, so
 * the closed line shows its text in the line. A table shows as its cells,
 * so the closed line stays one line. A heading is a span in the weight of
 * a heading too: the closed line stays one line, and the button role of a
 * summary hides a heading from the heading list of a screen reader. A
 * quote and a rule are spans with the look of `MarkdownProse.module.css`:
 * closed, a quote shows its text in the muted colour of a quote, and a
 * rule shows as a middle dot, as `chat-message-lines.md` says.
 */
function LineBlock(props: { block: TextBlock; open: boolean }) {
  const { block } = props
  switch (block.kind) {
    case 'p':
      return (
        <span className={classes(styles.paragraph, local.lineBlock)}>
          <AnswerText line text={block.text} />{' '}
        </span>
      )
    case 'heading':
      return (
        <span
          className={classes(
            styles.heading,
            local.lineBlock,
            local.lineHeading,
          )}
        >
          <AnswerText line text={block.text} />{' '}
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
    case 'quote':
      return (
        <>
          <span className={classes(line.quote, prose.quote)}>
            <LineBlocks blocks={block.blocks} open={props.open} />
          </span>{' '}
        </>
      )
    case 'rule':
      return (
        <>
          <span className={classes(line.rule, prose.rule)} />{' '}
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
export function LineBlocks(props: {
  blocks: readonly TextBlock[]
  open: boolean
}) {
  return props.blocks.map((block, index) => (
    <LineBlock block={block} key={index} open={props.open} />
  ))
}
