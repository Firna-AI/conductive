import type { Viewport } from '@mokly/mokly'
import { Archive } from 'lucide-react'
import type { Workspace } from '../../fixtures/workspaces'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'

/**
 * The question of Archive for a workspace from Conductor that was never
 * activated. It has no cloud computer, so Archive checks nothing and
 * deletes none. The question says what changes: the workspace can no
 * longer be activated, and its old sessions stay readable in Archived.
 * Cancel leaves the workspace as it was, and Archive leads to the archived
 * workspace.
 */
export function ImportedArchiveDialog(props: {
  workspace: Workspace
  /** The screen of the workspace that Cancel returns to. */
  cancelTo: string
  /** The screen of the archived workspace that Archive leads to. */
  archiveTo: string
  viewport: Viewport
}) {
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={props.cancelTo}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={props.archiveTo}>
            <ActionButton icon={Archive} tone="primary">
              Archive
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={`Archive ${props.workspace.name}?`}
      viewport={props.viewport}
    >
      <DialogText>
        After Archive, it can no longer be activated. Its sessions from
        Conductor stay in Archived, where you can read them.
      </DialogText>
    </ConfirmDialog>
  )
}
