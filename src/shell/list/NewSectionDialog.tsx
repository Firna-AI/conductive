import { useRef, useState, type Ref } from 'react'
import { CircleAlert, FolderPlus } from 'lucide-react'
import { Input, type InputFrameProps } from '@firna/ui/input'
import { Notice } from '../../ui/components/common/Notice'
import { useControlSizes } from '../../ui/components/common/touch'
import { newSectionWords } from '../../ui/components/workspaces/sectionCopy'
import { ActionButton } from '../ui/actions'
import { Dialog } from '../ui/Dialog'
import { useAction } from '../ui/useAction'

type InputHandle =
  NonNullable<InputFrameProps['inputRef']> extends Ref<infer Handle>
    ? Handle
    : never

/**
 * New section: a dialog that asks for the name of a new section. `create`
 * knows where the section goes. Create section stays off until the name
 * holds text. While the create runs, nothing closes the dialog. A failure
 * shows in the dialog, and the dialog keeps the name.
 */
export function NewSectionDialog(props: {
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
  const submit = () => {
    if (trimmed !== '') create.run(trimmed)
  }
  return (
    <Dialog
      action={
        <ActionButton
          busy={create.pending}
          disabled={trimmed === ''}
          icon={FolderPlus}
          onPress={submit}
          tone="primary"
        >
          {newSectionWords.create}
        </ActionButton>
      }
      busy={create.pending}
      close={props.close}
      initial={input}
      title={newSectionWords.title}
    >
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
