import type { Viewport } from '@mokly/mokly'
import { Check } from 'lucide-react'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { approveQuestion, approveTitle, type ApproveTarget } from './accessCopy'

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
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={props.cancel}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={props.done}>
            <ActionButton icon={Check} tone="primary">
              Approve
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={approveTitle(props.person.login)}
      viewport={props.viewport}
    >
      {approveQuestion(props.person).map((text) => (
        <DialogText key={text}>{text}</DialogText>
      ))}
    </ConfirmDialog>
  )
}
