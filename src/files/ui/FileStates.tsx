import { CircleAlert, FileWarning, FileX } from 'lucide-react'
import type { FilesError } from '../api/files-errors'
import { formatBytes } from '../model/file-text'
import { ActionButton } from './actions'
import { EmptyState, Loading } from './EmptyState'

/**
 * The loading and error states of a file, which the file page, the diff
 * page, and the Markdown preview share.
 */

/** The loading state of a file: its read, and the parse of its Markdown. */
export function LoadingFile() {
  return <Loading label="Opening the file" />
}

/**
 * What a file page or a diff page shows when its read failed. A Markdown
 * preview shows the `failed` state when no worker can parse its text.
 * The download route reads a file with the same limit, so a file over the
 * limit gets the terminal as its way to open, not Download.
 */
export function ReadError(props: {
  error: Exclude<FilesError, { kind: 'aborted' }>
  subject: 'file' | 'diff'
  onRetry: () => void
}) {
  const { error } = props
  switch (error.kind) {
    case 'not-found':
      return <EmptyState icon={FileX} title="This file moved or was deleted" />
    case 'too-large':
      return (
        <EmptyState
          body={`Files up to ${formatBytes(error.limitBytes)} open here. This one has ${formatBytes(error.sizeBytes)}.`}
          icon={FileWarning}
          title={
            props.subject === 'file'
              ? 'Open this file in the terminal'
              : 'See this diff in the terminal'
          }
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
