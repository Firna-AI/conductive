import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import type { Automation } from '../../fixtures/automations'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { ScreenLink } from '../common/ScreenLink'

/**
 * The owner, or an admin, confirms Delete, because a deleted automation cannot
 * come back. Its run workspaces stay, because they are normal workspaces
 * (decision 504 A). Delete automation opens the Automations list.
 */
export function DeleteAutomationDialog(props: {
  automation: Automation
  viewport: Viewport
}) {
  return (
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={paths.automation}>
            <actionButton.Component moklyInstance="dialog-cancel">
              Cancel
            </actionButton.Component>
          </ScreenLink>
          <ScreenLink asChild to={paths.automations}>
            <actionButton.Component
              icon="trash-2"
              moklyInstance="dialog-delete-automation"
              tone="danger"
            >
              Delete automation
            </actionButton.Component>
          </ScreenLink>
        </>
      }
      moklyInstance="delete-automation-dialog"
      title={`Delete ${props.automation.name}?`}
      viewport={props.viewport}
    >
      <dialogText.Component>
        Its triggers and prompt are deleted. Its run workspaces stay.
      </dialogText.Component>
    </confirmDialog.Component>
  )
}
