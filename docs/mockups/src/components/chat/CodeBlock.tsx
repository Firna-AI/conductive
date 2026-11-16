import type { CSSProperties } from 'react'
import { Copy } from 'lucide-react'
import { IconButton } from '../common/actions'
import { useControlSizes, useTouch } from '../common/touch'
import markdown from '../files/MarkdownView.module.css'
import styles from './CodeBlock.module.css'

/**
 * A code block of an answer, with its text exactly as the agent wrote it.
 * A path in it stays code. A Copy code button in its top corner copies the
 * text. With a mouse the button shows while the pointer is on the block, so
 * a view draws it only on a phone, where it always shows.
 */
export function CodeBlock(props: { text: string }) {
  const control = useControlSizes()
  if (!useTouch()) return <pre className={markdown.block}>{props.text}</pre>
  const size = { '--copy-size': `${control.height}px` } as CSSProperties
  return (
    <div className={styles.block} style={size}>
      <pre className={markdown.block}>{props.text}</pre>
      <span className={styles.copy}>
        <IconButton icon={Copy} label="Copy code" quiet />
      </span>
    </div>
  )
}
