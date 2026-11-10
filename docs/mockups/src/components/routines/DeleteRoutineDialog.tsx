import type { Viewport } from '@mokly/mokly'
import { Trash2 } from 'lucide-react'
import type { Routine } from '../../fixtures/routines'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'

/**
 * The owner, or an admin, confirms Delete, because a deleted routine cannot
 * come back. Its run workspaces stay, because they are normal workspaces
 * (decision 204 A). Delete routine opens the Routines list.
 */
export function DeleteRoutineDialog(props: {
  routine: Routine
  viewport: Viewport
}) {
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.routine}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.routines}>
            <ActionButton icon={Trash2} tone="danger">
              Delete routine
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={`Delete ${props.routine.name}?`}
      viewport={props.viewport}
    >
      <DialogText>
        Its triggers and prompt are deleted. Its run workspaces stay.
      </DialogText>
    </ConfirmDialog>
  )
}
