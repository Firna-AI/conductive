import { useState } from 'react'
import { CircleAlert, Trash2 } from 'lucide-react'
import { Input } from '@firna/ui/input'
import { deletionDay } from './time'
import { ActionButton } from './ui/actions'
import { ConfirmDialog, DialogText } from './ui/ConfirmDialog'
import { useControlSizes } from './ui/controls'
import { Notice } from './ui/Notice'

/**
 * An admin confirms Delete org by typing the name of the org. The dialog
 * says what happens at once, and the date when everything is deleted.
 * Delete org stays disabled until the typed name matches. While the
 * deletion runs, the question stays open.
 */
export function DeleteOrgDialog(props: {
  orgName: string
  /** When everything of the org is deleted, if an admin deletes it now. */
  deletesAt: number
  timeZone?: string
  busy: boolean
  error: string | null
  onConfirm: (name: string) => void
  onCancel: () => void
}) {
  const { field } = useControlSizes()
  const [typed, setTyped] = useState('')
  const name = typed.trim()
  const matches = name === props.orgName
  const confirm = () => {
    if (matches && !props.busy) props.onConfirm(name)
  }
  return (
    <ConfirmDialog
      action={
        <ActionButton
          busy={props.busy}
          disabled={!matches}
          icon={Trash2}
          onPress={confirm}
          tone="danger"
        >
          Delete org
        </ActionButton>
      }
      busy={props.busy}
      onCancel={props.onCancel}
      title={`Delete ${props.orgName}?`}
    >
      <DialogText>
        Every cloud computer of {props.orgName} stops now, and its members can
        no longer open it. Everything is deleted on{' '}
        {deletionDay(props.deletesAt, props.timeZone)}, unless an admin restores{' '}
        {props.orgName} before then.
      </DialogText>
      <Input
        autoCapitalize="none"
        autoCorrect={false}
        label={`Type ${props.orgName} to confirm`}
        onChangeText={setTyped}
        onSubmitEditing={confirm}
        size={field}
        spellCheck={false}
        value={typed}
      />
      {props.error ? (
        <Notice
          body={props.error}
          icon={CircleAlert}
          title={`${props.orgName} was not deleted`}
          tone="danger"
        />
      ) : null}
    </ConfirmDialog>
  )
}
