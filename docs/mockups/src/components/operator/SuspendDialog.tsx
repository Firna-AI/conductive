import type { Viewport } from '@mokly/mokly'
import { Ban, TriangleAlert } from 'lucide-react'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import { targetName, type Target } from './targets'

/** What a suspension stops, and what the members keep, for each kind. */
function stops(target: Target): string {
  const name = targetName(target)
  return target.kind === 'user'
    ? `${name} is signed out everywhere and cannot sign in. Their workspaces stop, and no member can start them until an admin moves them to another member.`
    : `Every cloud computer and build of ${name} stops now. Members can still open and read it, but they cannot change it or start a workspace.`
}

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
        <Notice
          icon={TriangleAlert}
          title="This is your own account. You will be signed out, and another operator must lift the suspension."
          tone="danger"
        />
      ) : null}
      <DialogText>{stops(props.target)}</DialogText>
      <DialogText>
        A stopped workspace gets no restart near day 14, so its files can be
        deleted. Lift gives the access back.
      </DialogText>
    </ConfirmDialog>
  )
}
