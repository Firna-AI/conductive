import { Fragment } from 'react'
import type {
  TextBlock,
  TextItem,
  TextList,
  TextTable,
} from '../../../chat/markdown/agent-blocks'
import type { InlineText } from '../../../chat/markdown/agent-inline'
import { FenceText } from '../../../files/code/CodeText'
import { classes } from '../common/classes'
import prose from '../common/MarkdownProse.module.css'
import { TaskBox } from '../common/TaskBox'
import markdown from '../files/MarkdownView.module.css'
import type { AgentDrawing, TextPlace } from './agentDrawing'
import blockStyles from './LineBlocks.module.css'
import line from './MessageLine.module.css'
import styles from './ToolGroup.module.css'

/**
 * The state of a message line that each of its blocks gets: whether the
 * line is open, and the drawing of the text of its message. A closed line
 * shows each image as its link, so the line stays one line.
 */
export interface LineState {
  open: boolean
  drawing: AgentDrawing
}

/** A paragraph or a list item of an open line, where a picture can show. */
const openText: TextPlace = { line: true, pictures: true }

/**
 * A heading or a table cell of a line, and the text of a closed line, which
 * keep the link of an image.
 */
const lineText: TextPlace = { line: true, pictures: false }

/** Where a line draws the text of a paragraph or of a list item. */
function textPlace(state: LineState): TextPlace {
  return state.open ? openText : lineText
}

/**
 * Whether a block is a table, or a list or a quote that holds one at any
 * depth. A `<summary>` holds no table, so a message line keeps the blocks
 * before the first such block, as `chat-message-lines.md` says.
 */
export function holdsTable(block: TextBlock): boolean {
  if (block.kind === 'table') return true
  if (block.kind === 'quote') return block.blocks.some(holdsTable)
  if (block.kind !== 'ul' && block.kind !== 'ol') return false
  return block.items.some((item) => item.blocks.some(holdsTable))
}

/**
 * The cells of a table as text, row by row, with a dot between two cells.
 * A cell keeps the link of an image, as in an answer.
 */
function TableText(props: { table: TextTable; drawing: AgentDrawing }) {
  const { head, rows } = props.table
  return [head, ...rows].flat().map((cell, index) => (
    <Fragment key={index}>
      {index > 0 ? ' · ' : null}
      {props.drawing.text(cell, lineText)}
    </Fragment>
  ))
}

/** The words that name the state of a task box for a screen reader. */
const taskStates = { done: 'done', open: 'not done' } as const

/**
 * The fixed check box of a task item in a message line: the `TaskBox` of an
 * answer, with its look. A screen reader reads the line as one button, so
 * the name of the box says whether its task is done.
 * `MessageLine.module.css` lets a press pass through the box to the line,
 * which opens or closes, and the box does not change.
 */
function LineTaskBox(props: { checked: boolean }) {
  const { checked } = props
  return (
    <TaskBox
      checked={checked}
      label={checked ? taskStates.done : taskStates.open}
    />
  )
}

/**
 * The text of a list item in a message line. An item of one paragraph shows
 * its text alone. Another item shows its blocks, such as its text and the
 * list that the agent indents under it. A task item shows its box before
 * the words of its first paragraph, which stay in the line of the box.
 */
function LineItem(props: { item: TextItem; state: LineState }) {
  const { checked, blocks } = props.item
  const { state } = props
  const [first, ...rest] = blocks
  const box = checked === null ? null : <LineTaskBox checked={checked} />
  if (first?.kind === 'p' && (rest.length === 0 || checked !== null)) {
    return (
      <>
        {box}
        {state.drawing.text(first.text, textPlace(state))}{' '}
        {rest.length > 0 ? <LineBlocks blocks={rest} state={state} /> : null}
      </>
    )
  }
  return (
    <>
      {box}
      <LineBlocks blocks={blocks} state={state} />
    </>
  )
}

/**
 * A list of a message line. Each item of a numbered list writes its
 * number, from the start of its list, because a browser numbers a list
 * item of spans by the items of the list of the fold. A task item shows
 * its box in the place of its number, as an answer does.
 */
function LineList(props: { list: TextList; state: LineState }) {
  const { list } = props
  const numbered = list.kind === 'ol'
  return (
    <span
      className={classes(
        styles.bullets,
        blockStyles.lineBlock,
        numbered && styles.numbered,
      )}
    >
      {list.items.map((item, index) => (
        <span
          className={classes(styles.bullet, item.checked !== null && line.task)}
          key={index}
        >
          {list.kind === 'ol' && item.checked === null ? (
            <>
              <span className={styles.number}>{list.start + index}.</span>{' '}
            </>
          ) : null}
          <LineItem item={item} state={props.state} />
        </span>
      ))}
    </span>
  )
}

/**
 * A heading of a message line: a span in the weight of a heading, as
 * `LineBlock` says. A heading whose text shows no words where it draws, as
 * the `ShowsWords` of the view reads it, draws nothing, also no space, so
 * the open line shows no empty line for it.
 */
function LineHeading(props: { text: InlineText; drawing: AgentDrawing }) {
  const { drawing, text } = props
  return (
    <drawing.ShowsWords text={text}>
      <span
        className={classes(
          styles.heading,
          blockStyles.lineBlock,
          blockStyles.lineHeading,
        )}
      >
        {drawing.text(text, lineText)}{' '}
      </span>
    </drawing.ShowsWords>
  )
}

/**
 * A block of a message line, as an answer draws it, with the same text,
 * workspace chips, and links. A `<summary>` holds only phrasing content and
 * headings, and no paragraph, list, quote, rule, or table. So each block is
 * a span, which CSS shows as a block while the line is open. A code block
 * takes the look of an answer's code block, and the colours of its fence
 * label from `FenceText`, only while the line is open, so the closed line
 * shows its plain text in the line. Its span holds no `<pre>` and no Copy
 * code button, because the line is a button itself. A table shows as its
 * cells, so the closed line stays one line. A heading is a span in the
 * weight of a heading too: the closed line stays one line, and the button
 * role of a summary hides a heading from the heading list of a screen
 * reader. A quote and a rule are spans with the look of
 * `MarkdownProse.module.css`: closed, a quote shows its text in the muted
 * colour of a quote, and a rule shows as a middle dot, as
 * `chat-message-lines.md` says. In the same way as a code block, the
 * Markdown image of a picture file in a paragraph or a list item shows as
 * its picture only while the line is open.
 */
function LineBlock(props: { block: TextBlock; state: LineState }) {
  const { block, state } = props
  switch (block.kind) {
    case 'p':
      return (
        <span className={classes(styles.paragraph, blockStyles.lineBlock)}>
          {state.drawing.text(block.text, textPlace(state))}{' '}
        </span>
      )
    case 'heading':
      return <LineHeading drawing={state.drawing} text={block.text} />
    case 'ul':
    case 'ol':
      return <LineList list={block} state={state} />
    case 'code':
      return (
        <>
          <span
            className={classes(
              blockStyles.lineBlock,
              blockStyles.code,
              state.open && markdown.block,
            )}
          >
            {state.open ? (
              <FenceText label={block.label} text={block.text} />
            ) : (
              block.text
            )}
          </span>{' '}
        </>
      )
    case 'quote':
      return (
        <>
          <span className={classes(line.quote, prose.quote)}>
            <LineBlocks blocks={block.blocks} state={state} />
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
        <span className={blockStyles.lineBlock}>
          <TableText drawing={state.drawing} table={block} />{' '}
        </span>
      )
  }
}

/**
 * The blocks of a message line as text, in the line. The app and the
 * mockups share them, and each gives the drawing of its text in `state`.
 */
export function LineBlocks(props: {
  blocks: readonly TextBlock[]
  state: LineState
}) {
  return props.blocks.map((block, index) => (
    <LineBlock block={block} key={index} state={props.state} />
  ))
}
