import itemStyles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import { MarkdownTable } from '../../../docs/mockups/src/components/common/MarkdownTable'
import markdownStyles from '../../../docs/mockups/src/components/files/MarkdownView.module.css'
import { LinkedText } from '../links/LinkedText'
import { textBlocks, type TextBlock } from './agent-text'

/** A cell of a table in an answer, with the formatting of a paragraph. */
function tableCell(text: string) {
  return <LinkedText strong text={text} />
}

function Block(props: { block: TextBlock }) {
  const { block } = props
  switch (block.kind) {
    case 'p':
      return (
        <p>
          <LinkedText strong text={block.text} />
        </p>
      )
    case 'ul':
    case 'ol': {
      const List = block.kind
      return (
        <List>
          {block.items.map((item, index) => (
            <li key={index}>
              <LinkedText strong text={item} />
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

/**
 * An answer of the agent: paragraphs, lists, code, and tables, as it writes
 * them. The text of a paragraph, a list item, or a table cell has `code`
 * and **strong** parts, as `chatParts` reads it. Each workspace link outside
 * code is a chip, and so is a Markdown link to a workspace, also with a bold
 * or code label.
 */
export function AgentText(props: { text: string }) {
  return (
    <div className={itemStyles.agent}>
      <AgentBlocks blocks={textBlocks(props.text)} />
    </div>
  )
}
