import { CircleAlert } from 'lucide-react'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import { EmptyState } from '../../../../../src/ui/components/common/EmptyState'
import { previewOpenFailedCopy } from '../../../../../src/ui/components/tools/previewCopy'

/**
 * A preview that the app could not open, in place of its page: the title,
 * the message of the server, and Try again, which opens the preview again.
 * A Preview tab and the tab of an HTML file show it, and screen readers
 * announce it. It takes no fixture, so the app can draw it too.
 */
export function PreviewOpenFailure(props: { message: string }) {
  return (
    <EmptyState
      action={<ActionButton>{previewOpenFailedCopy.retry}</ActionButton>}
      alert
      body={props.message}
      icon={CircleAlert}
      title={previewOpenFailedCopy.title}
    />
  )
}
