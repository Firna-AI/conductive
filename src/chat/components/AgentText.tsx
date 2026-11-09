import itemStyles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import markdownStyles from '../../../docs/mockups/src/components/files/MarkdownView.module.css'
import { LinkedText } from '../links/LinkedText'
import { textBlocks, type TextBlock } from './agent-text'

/**
 * Text with `code` and **strong** parts, as `chatParts` reads it. Each
 * workspace link outside code is a chip, and so is a Markdown link to a
 * workspace, also with a bold or code label. An answer and a message line
 * of a work fold both draw their text with it.
 */
export function InlineMarkdown(props: { text: string }) {
  return <LinkedText strong text={props.text} />
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
  }
}

/** An answer of the agent: paragraphs, lists, and code, as it writes them. */
export function AgentText(props: { text: string }) {
  return (
    <div className={itemStyles.agent}>
      {textBlocks(props.text).map((block, index) => (
        <Block block={block} key={index} />
      ))}
    </div>
  )
}
