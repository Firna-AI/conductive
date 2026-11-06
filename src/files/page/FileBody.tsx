import { File, FileBox } from 'lucide-react'
import { CodeView } from '../code/CodeView'
import type { MarkdownParser } from '../markdown/markdown-document'
import { MarkdownView } from '../markdown/MarkdownView'
import type { FileText } from '../model/file-text'
import { splitPath, type FileMode } from '../navigation'
import { isMarkdown } from '../panel/file-icons'
import { ActionButton } from '../ui/actions'
import { EmptyState } from '../ui/EmptyState'

/**
 * The content of a file page: rendered Markdown, or text with line numbers.
 * Both show the view text, without a leading byte order mark.
 */
export function FileContent(props: {
  path: string
  text: FileText
  mode: FileMode
  onDownload?: () => void
  /**
   * Parses Markdown on the calling thread, for a static render. Without
   * it, a module worker parses the Markdown of the file.
   */
  markdownParser?: MarkdownParser
}) {
  const { text } = props
  if (text.kind === 'binary') {
    return (
      <EmptyState
        action={
          props.onDownload ? (
            <ActionButton onPress={props.onDownload}>Download</ActionButton>
          ) : undefined
        }
        body="It is a binary file."
        icon={FileBox}
        title="Download this file to open it"
      />
    )
  }
  if (text.viewText === '')
    return <EmptyState icon={File} title="This file is empty" />
  if (isMarkdown(props.path) && props.mode === 'preview') {
    return <MarkdownView parser={props.markdownParser} text={text.viewText} />
  }
  return <CodeView name={splitPath(props.path).name} text={text.viewText} />
}
