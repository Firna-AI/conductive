import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { Input } from '@firna/ui/input'
import { noop } from '../../../../../src/ui/noop'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { confirmDialog } from '../../entries/components/common/ConfirmDialog.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { newSectionWords } from '../../../../../src/ui/components/workspaces/sectionCopy'

/**
 * New section, drawn open: a dialog that asks for the name of the section.
 * From the menu of a section, the new section goes directly below that
 * section. From the command palette, it goes at the end of the list. The
 * dialog does not say where. Create section stays off until the name holds
 * text. `failed` is the message of a create
 * that failed: it shows below the field, and the dialog keeps the name.
 */
export function NewSectionDialog(props: {
  viewport: Viewport
  name?: string
  failed?: string
}) {
  const { field } = useControlSizes()
  const name = props.name ?? ''
  return (
    <confirmDialog.Component
      actions={
        <>
          <actionButton.Component moklyInstance="dialog-cancel">
            Cancel
          </actionButton.Component>
          <actionButton.Component
            disabled={name.trim() === ''}
            icon="folder-plus"
            moklyInstance="dialog-create-section"
            tone="primary"
          >
            {newSectionWords.create}
          </actionButton.Component>
        </>
      }
      title={newSectionWords.title}
      viewport={props.viewport}
    >
      <Input
        label={newSectionWords.label}
        onChangeText={noop}
        placeholder={newSectionWords.placeholder}
        size={field}
        value={name}
      />
      {props.failed === undefined ? null : (
        <notice.Component
          body={props.failed}
          icon="circle-alert"
          moklyInstance="create-failed"
          title={newSectionWords.failed}
          tone="danger"
        />
      )}
    </confirmDialog.Component>
  )
}
