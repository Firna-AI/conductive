import type { Viewport } from '@mokly/mokly'
import { LockOpen } from 'lucide-react'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { targetName, type Target } from './targets'

/** What a lift gives back, for each kind of target. */
function givesBack(target: Target): string {
  return target.kind === 'user'
    ? `${targetName(target)} can sign in again, and their workspaces can start again.`
    : `Members can change ${target.name} again, and its workspaces can start again.`
}

/**
 * The operator confirms a lift. The dialog says what comes back, and that
 * the files of a workspace that stopped 14 days ago or more can be gone.
 */
export function LiftDialog(props: {
  target: Target
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
      title={`Lift the suspension of ${targetName(props.target)}?`}
      viewport={props.viewport}
    >
      <DialogText>{givesBack(props.target)}</DialogText>
      <DialogText>
        A workspace that stopped 14 days ago or more may have lost its files.
      </DialogText>
    </ConfirmDialog>
  )
}
