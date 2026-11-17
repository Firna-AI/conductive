import { useMemo } from 'react'
import itemStyles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import headingStyles from '../../../docs/mockups/src/components/common/MarkdownHeadings.module.css'
import prose from '../../../docs/mockups/src/components/common/MarkdownProse.module.css'
import { MarkdownTable } from '../../../docs/mockups/src/components/common/MarkdownTable'
import {
  agentBlocks,
  type TextBlock,
  type TextItem,
} from '../markdown/agent-blocks'
import type { InlineText } from '../markdown/agent-inline'
import { AnswerText } from '../markdown/AnswerText'
import { CodeBlock } from './CodeBlock'

/** A cell of a table in an answer, with the formatting of a paragraph. */
function tableCell(text: InlineText) {
  return <AnswerText text={text} />
}

/**
 * The items of a list. An item of one paragraph shows its text alone, as in
 * the file preview. Another item shows its blocks: its text, and the lists,
 * paragraphs, headings, code blocks, quotes, and tables that the agent
 * indents under it.
 */
function ListItems(props: { items: readonly TextItem[] }) {
  return props.items.map((item, index) => {
    const [first] = item
    const tight = item.length === 1 && first.kind === 'p'
    return (
      <li key={index}>
        {tight ? (
          <AnswerText text={first.text} />
        ) : (
          <AgentBlocks blocks={item} />
        )}
      </li>
    )
  })
}

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
}

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
 * rules, emphasis, and strikethrough take the look of the shared
 * `MarkdownProse.module.css`. A list item holds the blocks that the agent
 * indents under it. The text of each block draws through `AnswerText`.
 * Each update of a live answer reads the whole text again.
 */
export function AgentText(props: { text: string }) {
  const blocks = useMemo(() => agentBlocks(props.text), [props.text])
  return (
    <div
      className={classes(itemStyles.agent, headingStyles.headings, prose.prose)}
    >
      <AgentBlocks blocks={blocks} />
    </div>
  )
}
