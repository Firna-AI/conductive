import type { CSSProperties } from 'react'
import { Copy } from 'lucide-react'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import markdownStyles from '../../../docs/mockups/src/components/files/MarkdownView.module.css'
import { IconButton } from '../../shell/ui/actions'
import local from './chat.module.css'
import { codeCopyWords, useCodeCopy } from './code-copy'

/** The size of the Copy button, for the room that the code keeps for it. */
function copySize(height: number): CSSProperties {
  return { '--copy-size': `${height}px` } as CSSProperties
}

/**
 * A code block of an answer, with its text exactly as the agent wrote it.
 * Inside a `CodeCopyProvider`, a Copy button in its top corner copies that
 * text. The button sits outside the `<pre>`, so a selection of the code
 * does not take its name.
 */
export function CodeBlock(props: { text: string }) {
  const copy = useCodeCopy()
  const control = useControlSizes()
  if (copy === null) {
    return <pre className={markdownStyles.block}>{props.text}</pre>
  }
  return (
    <div className={local.codeBlock} style={copySize(control.height)}>
      <pre className={markdownStyles.block}>{props.text}</pre>
      <span className={local.codeCopy}>
        <IconButton
          icon={Copy}
          label={codeCopyWords.button}
          onPress={() => copy(props.text)}
          quiet
        />
      </span>
    </div>
  )
}
