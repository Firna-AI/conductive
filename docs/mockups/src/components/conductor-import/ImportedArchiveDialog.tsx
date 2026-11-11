import type { Viewport } from '@mokly/mokly'
import { Archive } from 'lucide-react'
import type { Workspace } from '../../fixtures/workspaces'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { LinkedControl } from '../common/LinkedControl'

/**
 * The question of Archive for a workspace from Conductor whose activation
 * never succeeded: before its activation, or after a failed one. Archive
 * checks nothing and deletes no stored work. The question says what
 * changes: the workspace cannot be activated while archived, and its old
 * sessions stay readable.
 * Cancel leaves the workspace as it was, and Archive leads to the archived
 * workspace.
 */
export function ImportedArchiveDialog(props: {
  workspace: Workspace
  /** The screen of the workspace that Cancel returns to. Null keeps it static. */
  cancelTo: string | null
  /**
   * The screen of the archived workspace that Archive leads to. Null keeps
   * it static.
   */
  archiveTo: string | null
  viewport: Viewport
}) {
  return (
    <ConfirmDialog
      actions={
        <>
          <LinkedControl to={props.cancelTo}>
            <ActionButton>Cancel</ActionButton>
          </LinkedControl>
          <LinkedControl to={props.archiveTo}>
            <ActionButton icon={Archive} tone="primary">
              Archive
            </ActionButton>
          </LinkedControl>
        </>
      }
      title={`Archive ${props.workspace.name}?`}
      viewport={props.viewport}
    >
      <DialogText>
        It cannot be activated while archived. Its old sessions stay readable.
      </DialogText>
    </ConfirmDialog>
  )
}
