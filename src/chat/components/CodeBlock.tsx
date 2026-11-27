import type { CSSProperties } from 'react'
import { Copy } from 'lucide-react'
import { useControlSizes } from '../../ui/components/common/touch'
import markdownStyles from '../../ui/components/files/MarkdownView.module.css'
import { FenceText } from '../../files/code/CodeText'
import { IconButton } from '../../shell/ui/actions'
import local from './chat.module.css'
import { codeCopyWords, useCodeCopy } from './code-copy'

/** The size of the Copy button, for the room that the code keeps for it. */
function copySize(height: number): CSSProperties {
  return { '--copy-size': `${height}px` } as CSSProperties
}

/**
 * A code block of an answer, with its text exactly as the agent wrote it.
 * A `label` that names a language gives the lines the colours of a file
 * tab of that language, as `FenceText` draws them. Any other block shows
 * plain text. Inside a `CodeCopyProvider`, a Copy button in its top corner
 * copies the text. The button sits outside the `<pre>`, so a selection of
 * the code does not take its name.
 */
export function CodeBlock(props: { text: string; label: string | null }) {
  const copy = useCodeCopy()
  const control = useControlSizes()
  const code = (
    <pre className={markdownStyles.block}>
      <FenceText label={props.label} text={props.text} />
    </pre>
  )
  if (copy === null) return code
  return (
    <div className={local.codeBlock} style={copySize(control.height)}>
      {code}
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
