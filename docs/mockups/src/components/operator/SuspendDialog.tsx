import type { Viewport } from '@mokly/mokly'
import { Ban, TriangleAlert } from 'lucide-react'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import { selfSuspendWarning, suspendFiles, suspendStops } from './operatorCopy'
import { targetName, type Target } from './targets'

/**
 * The operator confirms a suspension. The dialog says what stops, what
 * the members keep, and that the files of a stopped workspace can be
 * deleted. For the operator's own account it warns first.
 */
export function SuspendDialog(props: {
  target: Target
  /** The operator suspends their own account. */
  self?: boolean
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
      title={`Suspend ${targetName(props.target)}?`}
      viewport={props.viewport}
    >
      {props.self ? (
        <Notice icon={TriangleAlert} title={selfSuspendWarning} tone="danger" />
      ) : null}
      <DialogText>
        {suspendStops(props.target.kind, targetName(props.target))}
      </DialogText>
      <DialogText>{suspendFiles}</DialogText>
    </ConfirmDialog>
  )
}
