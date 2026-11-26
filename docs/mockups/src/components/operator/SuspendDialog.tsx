import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { checkOption } from '../../entries/components/common/CheckOption.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { disableCodeOffer } from '../../../../../src/ui/components/operator/accessCopy'
import {
  selfSuspendWarning,
  suspendQuestion,
  type QuestionTarget,
} from '../../../../../src/ui/components/operator/operatorCopy'
import { instanceKey } from '../../instanceKey'

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
              icon="ban"
              moklyInstance="dialog-suspend"
              tone="danger"
            >
              {label}
            </actionButton.Component>
          </ScreenLink>
        </>
      }
      moklyInstance="suspend-dialog"
      title={`Suspend ${props.target.name}?`}
      viewport={props.viewport}
    >
      {props.self ? (
        <notice.Component
          icon="triangle-alert"
          moklyInstance="self-suspend-warning"
          title={selfSuspendWarning}
          tone="danger"
        />
      ) : null}
      {suspendQuestion(props.target).map((text) => (
        <dialogText.Component key={text} moklyInstance={instanceKey(text)}>
          {text}
        </dialogText.Component>
      ))}
      {props.referral ? (
        <checkOption.Component
          checked
          moklyInstance="disable-code-option"
          hint={disableCodeOffer.hint(props.referral)}
          label={disableCodeOffer.label}
        />
      ) : null}
    </confirmDialog.Component>
  )
}
