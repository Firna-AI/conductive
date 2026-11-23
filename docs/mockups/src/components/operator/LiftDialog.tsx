import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { ScreenLink } from '../common/ScreenLink'
import {
  liftQuestion,
  type QuestionTarget,
} from '../../../../../src/ui/components/operator/operatorCopy'
import { instanceKey } from '../../instanceKey'

/**
 * The operator confirms a lift. The dialog says what comes back, and that
 * the files of a workspace on the `boat` account that stopped 14 days ago
 * or more can be gone. A deleted org stays deleted, so the dialog promises
 * it no access. `extra` adds a paragraph, such as the switch build that
 * the lift starts.
 */
export function LiftDialog(props: {
  target: QuestionTarget
  viewport: Viewport
  /** The page that Cancel returns to, and the page after the lift. */
  cancel: string
  done: string
  extra?: string
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
              icon="lock-open"
              moklyInstance="dialog-lift-suspension"
              tone="primary"
            >
              Lift suspension
            </actionButton.Component>
          </ScreenLink>
        </>
      }
      moklyInstance="lift-dialog"
      title={`Lift the suspension of ${props.target.name}?`}
      viewport={props.viewport}
    >
      {liftQuestion(props.target).map((text) => (
        <dialogText.Component key={text} moklyInstance={instanceKey(text)}>
          {text}
        </dialogText.Component>
      ))}
      {props.extra ? (
        <dialogText.Component moklyInstance={instanceKey(props.extra)}>
          {props.extra}
        </dialogText.Component>
      ) : null}
    </confirmDialog.Component>
  )
}
