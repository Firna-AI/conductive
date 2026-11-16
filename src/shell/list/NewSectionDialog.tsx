import { useRef, useState, type Ref } from 'react'
import { CircleAlert, FolderPlus } from 'lucide-react'
import { Input, type InputFrameProps } from '@firna/ui/input'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { newSectionWords } from '../../../docs/mockups/src/components/workspaces/sectionCopy'
import type { Section } from '../../shared/sections'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { useAction } from '../ui/useAction'

type InputHandle =
  NonNullable<InputFrameProps['inputRef']> extends Ref<infer Handle>
    ? Handle
    : never

/**
 * New section: a dialog that asks for the name of a new section. From the
 * menu of a section, `below` is that section, and the new section goes
 * directly below it. Without it, as from the command palette, the new
 * section goes at the end of the list. Create section stays off until the
 * name holds text. While the create runs, nothing closes the dialog. A
 * failure shows in the dialog, and the dialog keeps the name.
 */
export function NewSectionDialog(props: {
  below: Section | null
  create: (name: string) => Promise<unknown>
  close: () => void
}) {
  const { field } = useControlSizes()
  const input = useRef<InputHandle>(null)
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const create = useAction(async (value: string) => {
    await props.create(value)
    props.close()
  })
  const dismiss = () => {
    if (!create.pending) props.close()
  }
  const submit = () => {
    if (trimmed !== '') create.run(trimmed)
  }
  return (
    <Dialog
      actions={
        <>
          <ActionButton disabled={create.pending} onPress={dismiss}>
            Cancel
          </ActionButton>
          <ActionButton
            busy={create.pending}
            disabled={trimmed === ''}
            icon={FolderPlus}
            onPress={submit}
            tone="primary"
          >
            {newSectionWords.create}
          </ActionButton>
        </>
      }
      close={dismiss}
      initial={input}
      title={newSectionWords.title}
    >
      <DialogText>
        {props.below
          ? newSectionWords.below(props.below.name)
          : newSectionWords.atEnd}
      </DialogText>
      <Input
        editable={!create.pending}
        inputRef={input}
        label={newSectionWords.label}
        onChangeText={setName}
        onSubmitEditing={submit}
        placeholder={newSectionWords.placeholder}
        size={field}
        value={name}
      />
      {create.error ? (
        <Notice
          body={create.error.message}
          icon={CircleAlert}
          title={newSectionWords.failed}
          tone="danger"
        />
      ) : null}
    </Dialog>
  )
}
