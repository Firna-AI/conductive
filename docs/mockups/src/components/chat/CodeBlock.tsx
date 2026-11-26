import type { CSSProperties } from 'react'
import type { Language } from '../../../../../src/files/code/languages'
import { iconButton } from '../../entries/components/common/actions.mockup'
import {
  useControlSizes,
  useTouch,
} from '../../../../../src/ui/components/common/touch'
import { instanceKey } from '../../instanceKey'
import { CodeBlockText } from '../common/CodeBlockText'
import markdown from '../../../../../src/ui/components/files/MarkdownView.module.css'
import styles from './CodeBlock.module.css'

/**
 * A code block of an answer, with its text exactly as the agent wrote it.
 * With `language`, the language of its fence label, its lines show the
 * colours of a file tab of that language. Without one, its text stays
 * plain. A path in it stays code. A Copy code button in its top corner
 * copies the text. With a mouse the button shows while the pointer is on
 * the block, so a view draws it only on a phone, where it always shows.
 * The blocks of an answer have no key, so the text of the block names its
 * button for Mokly.
 */
export function CodeBlock(props: { text: string; language?: Language | null }) {
  const control = useControlSizes()
  const code = (
    <pre className={markdown.block}>
      <CodeBlockText language={props.language ?? null} text={props.text} />
    </pre>
  )
  if (!useTouch()) return code
  const size = { '--copy-size': `${control.height}px` } as CSSProperties
  const key = instanceKey(props.text)
  return (
    <div className={styles.block} style={size}>
      {code}
      <span className={styles.copy}>
        <iconButton.Component
          icon="copy"
          label="Copy code"
          moklyInstance={key ? `copy-${key}` : 'copy'}
          quiet
        />
      </span>
    </div>
  )
}
