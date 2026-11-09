import type { Viewport } from '@mokly/mokly'
import { LockOpen } from 'lucide-react'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { liftQuestion, type QuestionTarget } from './operatorCopy'

/**
 * The operator confirms a lift. The dialog says what comes back, and that
 * the files of a workspace that stopped 14 days ago or more can be gone. A
 * deleted org stays deleted, so the dialog promises it no access.
 */
export function LiftDialog(props: {
  target: QuestionTarget
  viewport: Viewport
  /** The page that Cancel returns to, and the page after the lift. */
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
            <ActionButton icon={LockOpen} tone="primary">
              Lift suspension
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={`Lift the suspension of ${props.target.name}?`}
      viewport={props.viewport}
    >
      {liftQuestion(props.target).map((text) => (
        <DialogText key={text}>{text}</DialogText>
      ))}
    </ConfirmDialog>
  )
}
