import itemStyles from '../../../docs/mockups/src/components/chat/ChatItemView.module.css'
import inlineStyles from '../../../docs/mockups/src/components/common/InlineText.module.css'
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
