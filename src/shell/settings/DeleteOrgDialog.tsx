import { useState } from 'react'
import { Input } from '@firna/ui/input'
import { Trash2 } from 'lucide-react'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import { formatDay, useNow } from '../../app/time'
import type { OrgSummary } from '../../shared/orgs'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { Dialog, DialogText } from '../ui/Dialog'
import { useAction } from '../ui/useAction'

/**
 * The days that a deleted org waits before the app deletes everything,
 * unless an admin restores it (decision 30).
 */
export const deletionDays = 7

const day = 86_400_000

/**
 * An admin confirms Delete org by typing the name of the org. The dialog
 * says what happens at once, and the day when everything is deleted. Then
 * the app opens the deleted org, which offers Restore.
 */
export function DeleteOrgDialog(props: { org: OrgSummary; close: () => void }) {
  const { org } = props
  const app = useApp()
  const go = useGo()
  const { timeZone } = useServices()
  const now = useNow(60_000)
  const { field } = useControlSizes()
  const [typed, setTyped] = useState('')
  const remove = useAction(async () => {
    await app.deleteOrg(org.id, typed)
    go(routes.org(org.id))
  }, 'The org was not deleted')
  const confirmed = typed === org.name
  const confirm = () => {
    if (confirmed) remove.run()
  }
  return (
    <Dialog
      actions={
        <>
          <ActionButton onPress={props.close}>Cancel</ActionButton>
          <ActionButton
            busy={remove.pending}
            disabled={!confirmed}
            icon={Trash2}
            onPress={confirm}
            tone="danger"
          >
            Delete org
          </ActionButton>
        </>
      }
      close={props.close}
      title={`Delete ${org.name}?`}
    >
      <DialogText>
        Every cloud computer of {org.name} stops now, and its members can no
        longer open it. Everything is deleted on{' '}
        {formatDay(now + deletionDays * day, timeZone)}, unless an admin
        restores {org.name} before then.
      </DialogText>
      <Input
        autoComplete="off"
        label={`Type ${org.name} to confirm`}
        onChangeText={setTyped}
        onSubmitEditing={confirm}
        size={field}
        value={typed}
      />
    </Dialog>
  )
}
