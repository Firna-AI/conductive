import type { Viewport } from '@mokly/mokly'
import { Trash2 } from 'lucide-react'
import type { Automation } from '../../fixtures/automations'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
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
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.automation}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.automations}>
            <ActionButton icon={Trash2} tone="danger">
              Delete automation
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={`Delete ${props.automation.name}?`}
      viewport={props.viewport}
    >
      <DialogText>
        Its triggers and prompt are deleted. Its run workspaces stay.
      </DialogText>
    </ConfirmDialog>
  )
}
