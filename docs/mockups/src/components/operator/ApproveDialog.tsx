import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { ScreenLink } from '../common/ScreenLink'
import {
  approveQuestion,
  approveTitle,
  type ApproveTarget,
} from '../../../../../src/ui/components/operator/accessCopy'
import { instanceKey } from '../../instanceKey'

/**
 * The operator confirms an approval. The question names the person and
 * says that an approval is final. With a verified email, it says that an
 * email tells them at once. Without one, no email goes out, so it says
 * that they see the app access at their next visit.
 */
export function ApproveDialog(props: {
  person: ApproveTarget
  viewport: Viewport
  /** The page that Cancel returns to, and the page after the approval. */
  cancel: string
  done: string
}) {
  return (
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={props.cancel}>
            <actionButton.Component moklyInstance="dialog-cancel">
              Cancel
            </actionButton.Component>
          </ScreenLink>
          <ScreenLink asChild to={props.done}>
            <actionButton.Component
              icon="check"
              moklyInstance="dialog-approve"
              tone="primary"
            >
              Approve
            </actionButton.Component>
          </ScreenLink>
        </>
      }
      moklyInstance="approve-dialog"
      title={approveTitle(props.person.login)}
      viewport={props.viewport}
    >
      {approveQuestion(props.person).map((text) => (
        <dialogText.Component key={text} moklyInstance={instanceKey(text)}>
          {text}
        </dialogText.Component>
      ))}
    </confirmDialog.Component>
  )
}
