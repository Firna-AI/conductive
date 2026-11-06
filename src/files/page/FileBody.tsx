import { CircleAlert, File, FileBox, FileWarning, FileX } from 'lucide-react'
import type { FilesError } from '../api/files-errors'
import { CodeView } from '../code/CodeView'
import { MarkdownView } from '../markdown/MarkdownView'
import { formatBytes, type FileText } from '../model/file-text'
import { splitPath, type FileMode } from '../navigation'
import { isMarkdown } from '../panel/file-icons'
import { ActionButton } from '../ui/actions'
import { EmptyState, Loading } from '../ui/EmptyState'

/** What a file page or a diff page shows when its read failed. */
export function ReadError(props: {
  error: Exclude<FilesError, { kind: 'aborted' }>
  subject: 'file' | 'diff'
  onRetry: () => void
  onDownload?: () => void
}) {
  const { error } = props
  switch (error.kind) {
    case 'not-found':
      return <EmptyState icon={FileX} title="This file moved or was deleted" />
    case 'too-large':
      return (
        <EmptyState
          action={
            props.onDownload ? (
              <ActionButton onPress={props.onDownload}>Download</ActionButton>
            ) : undefined
          }
          body={`Files up to ${formatBytes(error.limitBytes)} open here. This one has ${formatBytes(error.sizeBytes)}.`}
          icon={FileWarning}
          title="Download this file to read it"
        />
      )
    case 'failed':
      return (
        <EmptyState
          action={
            <ActionButton onPress={props.onRetry}>Try again</ActionButton>
          }
          alert
          icon={CircleAlert}
          title={
            props.subject === 'file'
              ? "This file didn't open"
              : "This diff didn't open"
          }
        />
      )
  }
}

/** The content of a file page: rendered Markdown, or text with line numbers. */
export function FileContent(props: {
  path: string
  text: FileText
  mode: FileMode
  onDownload?: () => void
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
  if (text.text === '')
    return <EmptyState icon={File} title="This file is empty" />
  if (isMarkdown(props.path) && props.mode === 'preview') {
    return <MarkdownView text={text.text} />
  }
  return <CodeView name={splitPath(props.path).name} text={text.text} />
}

export function LoadingFile() {
  return <Loading label="Opening the file" />
}
