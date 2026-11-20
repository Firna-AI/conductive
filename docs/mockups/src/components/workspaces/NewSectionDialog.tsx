import type { Viewport } from '@mokly/mokly'
import { CircleAlert, FolderPlus } from 'lucide-react'
import { Input } from '@firna/ui/input'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { Notice } from '../common/Notice'
import { useControlSizes } from '../common/touch'
import { newSectionWords } from './sectionCopy'

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
    <ConfirmDialog
      actions={
        <>
          <ActionButton>Cancel</ActionButton>
          <ActionButton
            disabled={name.trim() === ''}
            icon={FolderPlus}
            tone="primary"
          >
            {newSectionWords.create}
          </ActionButton>
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
        <Notice
          body={props.failed}
          icon={CircleAlert}
          title={newSectionWords.failed}
          tone="danger"
        />
      )}
    </ConfirmDialog>
  )
}
