import itemStyles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import inlineStyles from '../../../docs/mockups/src/components/common/InlineText.module.css'
import { MarkdownTable } from '../../../docs/mockups/src/components/common/MarkdownTable'
import markdownStyles from '../../../docs/mockups/src/components/files/MarkdownView.module.css'
import { inlineParts, textBlocks, type TextBlock } from './agent-text'

/** Text with `code` and **strong** parts. */
export function InlineMarkdown(props: { text: string }) {
  return (
    <>
      {inlineParts(props.text).map((part, index) => {
        if (part.kind === 'code') {
          return (
            <code className={inlineStyles.code} key={index}>
              {part.text}
            </code>
          )
        }
        if (part.kind === 'strong')
          return <strong key={index}>{part.text}</strong>
        return part.text
      })}
    </>
  )
}

/** A cell of a table in an answer, with its inline code and strong text. */
function tableCell(text: string) {
  return <InlineMarkdown text={text} />
}

function Block(props: { block: TextBlock }) {
  const { block } = props
  switch (block.kind) {
    case 'p':
      return (
        <p>
          <InlineMarkdown text={block.text} />
        </p>
      )
    case 'ul':
    case 'ol': {
      const List = block.kind
      return (
        <List>
          {block.items.map((item, index) => (
            <li key={index}>
              <InlineMarkdown text={item} />
            </li>
          ))}
        </List>
      )
    }
    case 'code':
      return <pre className={markdownStyles.block}>{block.text}</pre>
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
 * draw them. The element around them sets the type and the space between.
 */
export function AgentBlocks(props: { blocks: readonly TextBlock[] }) {
  return props.blocks.map((block, index) => <Block block={block} key={index} />)
}

/** An answer of the agent: paragraphs, lists, code, and tables, as it writes them. */
export function AgentText(props: { text: string }) {
  return (
    <div className={itemStyles.agent}>
      <AgentBlocks blocks={textBlocks(props.text)} />
    </div>
  )
}
