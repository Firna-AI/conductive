import type { Viewport } from '@mokly/mokly'
import { FolderPlus } from 'lucide-react'
import { Input } from '@firna/ui/input'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { useControlSizes } from '../common/touch'
import { newSectionWords } from './sectionCopy'

/**
 * New section, drawn open: a dialog that asks for the name of the section.
 * From the menu of a section, `below` names that section, and the new
 * section goes directly below it. Without `below`, as from the command
 * palette, the new section goes at the end of the list. Create section
 * stays off until the name holds text.
 */
export function NewSectionDialog(props: {
  viewport: Viewport
  below?: string
  name?: string
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
      <DialogText>
        {props.below === undefined
          ? newSectionWords.atEnd
          : newSectionWords.below(props.below)}
      </DialogText>
      <Input
        label={newSectionWords.label}
        onChangeText={noop}
        placeholder={newSectionWords.placeholder}
        size={field}
        value={name}
      />
    </ConfirmDialog>
  )
}
