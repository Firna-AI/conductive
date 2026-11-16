import type { Viewport } from '@mokly/mokly'
import type { Routine } from '../../fixtures/routines'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { ScreenLink } from '../common/ScreenLink'

/**
 * The owner, or an admin, confirms Delete, because a deleted routine cannot
 * come back. Its run workspaces stay, because they are normal workspaces
 * (decision 504 A). Delete routine opens the Routines list.
 */
export function DeleteRoutineDialog(props: {
  routine: Routine
  viewport: Viewport
}) {
  return (
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={paths.routine}>
            <actionButton.Component moklyInstance="dialog-cancel">
              Cancel
            </actionButton.Component>
          </ScreenLink>
          <ScreenLink asChild to={paths.routines}>
            <actionButton.Component
              icon="trash-2"
              moklyInstance="dialog-delete-routine"
              tone="danger"
            >
              Delete routine
            </actionButton.Component>
          </ScreenLink>
        </>
      }
      moklyInstance="delete-routine-dialog"
      title={`Delete ${props.routine.name}?`}
      viewport={props.viewport}
    >
      <dialogText.Component>
        Its triggers and prompt are deleted. Its run workspaces stay.
      </dialogText.Component>
    </confirmDialog.Component>
  )
}
