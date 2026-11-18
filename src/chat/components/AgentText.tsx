import { memo, useMemo } from 'react'
import itemStyles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import headingStyles from '../../../docs/mockups/src/components/common/MarkdownHeadings.module.css'
import prose from '../../../docs/mockups/src/components/common/MarkdownProse.module.css'
import { MarkdownTable } from '../../../docs/mockups/src/components/common/MarkdownTable'
import { MarkdownItem } from '../../markdown/MarkdownItem'
import {
  agentBlocks,
  type TextBlock,
  type TextItem,
} from '../markdown/agent-blocks'
import type { InlineText } from '../markdown/agent-inline'
import { AnswerText } from '../markdown/AnswerText'
import { sameData } from '../markdown/same-data'
import { CodeBlock } from './CodeBlock'

/** A cell of a table in an answer, with the formatting of a paragraph. */
function tableCell(text: InlineText) {
  return <AnswerText text={text} />
}

/** The text of a paragraph of a list item, or null for another block. */
function itemText(block: TextBlock) {
  return block.kind === 'p' ? <AnswerText text={block.text} /> : null
}

/** The blocks of a list item after its text. */
function itemBlocks(blocks: readonly TextBlock[]) {
  return <AgentBlocks blocks={blocks} />
}

/**
 * The items of a list, as `MarkdownItem` draws them in the file preview too.
 * An item of one paragraph shows its text alone. Another item shows its
 * blocks: its text, and the lists, paragraphs, headings, code blocks,
 * quotes, and tables that the agent indents under it. A task item shows its
 * fixed check box at the start of its text.
 */
function ListItems(props: { items: readonly TextItem[] }) {
  return props.items.map((item, index) => (
    <MarkdownItem blocks={itemBlocks} item={item} key={index} text={itemText} />
  ))
}

/**
 * One block of an answer. It draws again only when its data changes, so a
 * live update draws only the blocks whose text changed. A change of what
 * the chat reads the text with, such as the workspaces, still reaches each
 * `AnswerText` inside it, which reads that itself.
 */
const Block = memo(
  function Block(props: { block: TextBlock }) {
    const { block } = props
    switch (block.kind) {
      case 'p':
        return (
          <p>
            <AnswerText text={block.text} />
          </p>
        )
      case 'heading': {
        const Heading = `h${block.level}` as const
        return (
          <Heading>
            <AnswerText text={block.text} />
          </Heading>
        )
      }
      case 'ul':
        return (
          <ul>
            <ListItems items={block.items} />
          </ul>
        )
      case 'ol':
        return (
          <ol start={block.start}>
            <ListItems items={block.items} />
          </ol>
        )
      case 'code':
        return <CodeBlock text={block.text} />
      case 'quote':
        return (
          <blockquote>
            <AgentBlocks blocks={block.blocks} />
          </blockquote>
        )
      case 'rule':
        return <hr />
      case 'table':
        return (
          <MarkdownTable
            align={block.align}
            head={block.head}
            renderCell={tableCell}
            rows={block.rows}
          />
        )
    }
  },
  (before, after) => sameData(before.block, after.block),
)

/**
 * The blocks of an answer in order, as `AgentText` and an open message line
 * draw them. The element around them sets the type, the space between, and
 * the look of quotes and rules.
 */
export function AgentBlocks(props: { blocks: readonly TextBlock[] }) {
  return props.blocks.map((block, index) => <Block block={block} key={index} />)
}

/**
 * An answer of the agent: paragraphs, headings, lists, code, quotes, rules,
 * and tables, as `agentBlocks` reads them with the shared Markdown parser.
 * A heading is `h1` to `h6`, at the level that the agent wrote, and its
 * look comes from the heading style that the file preview shares. Quotes,
 * rules, bold text, emphasis, strikethrough, and task boxes take the look
 * of the shared `MarkdownProse.module.css`. A list item holds the blocks
 * that the agent indents under it. The text of each block draws through
 * `AnswerText`. `live` marks an answer that the agent still writes, whose
 * open marks close at the end of its text.
 *
 * Each update of a live answer reads the whole text again, and draws again
 * only the blocks whose data changed. An answer whose text and `live` stay
 * the same draws nothing again.
 */
export const AgentText = memo(function AgentText(props: {
  text: string
  live?: boolean
}) {
  const live = props.live === true
  const blocks = useMemo(
    () => agentBlocks(props.text, live),
    [props.text, live],
  )
  return (
    <div
      className={classes(itemStyles.agent, headingStyles.headings, prose.prose)}
    >
      <AgentBlocks blocks={blocks} />
    </div>
  )
})
