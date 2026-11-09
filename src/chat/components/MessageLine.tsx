import { useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/chat/ToolGroup.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import markdown from '../../../docs/mockups/src/components/files/MarkdownView.module.css'
import { InlineMarkdown } from './AgentText'
import { textBlocks, type TextBlock } from './agent-text'
import local from './chat.module.css'
import { useFold } from './useFold'

/**
 * A block of a message line, as `AgentText` draws it. A `<summary>` holds
 * only phrasing content, so each block is a span, which CSS shows as a block
 * while the line is open. A code block takes the look of an answer's code
 * block only then, so the closed line shows its text in the line. Each item
 * of a numbered list writes its number, because a browser numbers a list
 * item of spans by the items of the list of the fold.
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
  }
}

/**
 * A message of the agent in an open work fold: an icon and the first words
 * of the message on one line, cut with an ellipsis. A click grows the line
 * to the full text, with the paragraphs, lists, and code of the message,
 * and the line keeps its place. Another click cuts it again.
 */
export function MessageLine(props: { text: string }) {
  const [open, setOpen] = useState(false)
  const fold = useFold(open, setOpen)
  return (
    <details
      className={classes(styles.message, local.message)}
      {...fold.details}
    >
      <summary className={styles.messageLine} {...fold.line}>
        <MessageSquareText aria-hidden className={styles.icon} size={13} />
        <span className={styles.messageText}>
          {textBlocks(props.text).map((block, index) => (
            <LineBlock block={block} key={index} open={open} />
          ))}
        </span>
      </summary>
    </details>
  )
}
