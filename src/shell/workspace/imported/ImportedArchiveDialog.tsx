import { Archive } from 'lucide-react'
import { nameLabel } from '../../../shared/name-label'
import type { Workspace } from '../../../shared/workspaces'
import { ActionButton } from '../../ui/actions'
import { Dialog, DialogText } from '../../ui/Dialog'

/**
 * The question of Archive for a workspace from Conductor whose activation
 * never succeeded: before its activation, or after a failed one. Archive
 * checks nothing and deletes no stored work. The question says what
 * changes: the workspace cannot be activated while archived, and its old
 * sessions stay readable. Cancel leaves the workspace as it was.
 */
export function ImportedArchiveDialog(props: {
  workspace: Workspace
  close: () => void
  archive: () => void
}) {
  return (
    <Dialog
      actions={
        <>
          <ActionButton onPress={props.close}>Cancel</ActionButton>
          <ActionButton icon={Archive} onPress={props.archive} tone="primary">
            Archive
          </ActionButton>
        </>
      }
      close={props.close}
      title={`Archive ${nameLabel(props.workspace.name)}?`}
    >
      <DialogText>
        It cannot be activated while archived. Its old sessions stay readable.
      </DialogText>
    </Dialog>
  )
}
