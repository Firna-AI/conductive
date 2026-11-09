import type { Viewport } from '@mokly/mokly'
import { Ban, TriangleAlert } from 'lucide-react'
import { ActionButton } from '../common/actions'
import { CheckOption } from '../common/CheckOption'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import {
  selfSuspendWarning,
  suspendQuestion,
  type QuestionTarget,
} from './operatorCopy'

/**
 * The operator confirms a suspension. The dialog says what stops, what
 * the members keep, what a lift does not bring back, and that the files of
 * a stopped workspace can be deleted. For a deleted org it says that no
 * admin can restore the org while it is suspended. For the operator's own
 * account it warns first. For a user with a referral code that still
 * works, it offers to disable that code too, on by default.
 */
export function SuspendDialog(props: {
  target: QuestionTarget
  /** The operator suspends their own account. */
  self?: boolean
  /** The referral code of the user, when it still lets people in. */
  referral?: string
  viewport: Viewport
  /** The page that Cancel returns to, and the page after the suspension. */
  cancel: string
  done: string
}) {
  const label = props.target.kind === 'user' ? 'Suspend user' : 'Suspend org'
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={props.cancel}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={props.done}>
            <ActionButton icon={Ban} tone="danger">
              {label}
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={`Suspend ${props.target.name}?`}
      viewport={props.viewport}
    >
      {props.self ? (
        <Notice icon={TriangleAlert} title={selfSuspendWarning} tone="danger" />
      ) : null}
      {suspendQuestion(props.target).map((text) => (
        <DialogText key={text}>{text}</DialogText>
      ))}
      {props.referral ? (
        <CheckOption
          checked
          hint={`${props.referral} then lets nobody in, also after a lift. Disable is final.`}
          label="Also disable their referral code"
        />
      ) : null}
    </ConfirmDialog>
  )
}
