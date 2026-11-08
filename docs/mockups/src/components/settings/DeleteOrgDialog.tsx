import type { Viewport } from '@mokly/mokly'
import { Input } from '@firna/ui/input'
import { Trash2 } from 'lucide-react'
import { deletedOrg, orgs } from '../../fixtures/orgs'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'

/**
 * An admin confirms Delete org by typing the name of the org. The dialog
 * says what happens at once, and the date when everything is deleted.
 */
export function DeleteOrgDialog(props: { viewport: Viewport }) {
  const { field } = useControlSizes()
  const org = orgs[deletedOrg.org]
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.orgSettings}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.deletedOrg}>
            <ActionButton icon={Trash2} tone="danger">
              Delete org
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={`Delete ${org.name}?`}
      viewport={props.viewport}
    >
      <DialogText>
        Every cloud computer of {org.name} stops now, and its members can no
        longer open it. Everything is deleted on {deletedOrg.deletes}, unless an
        admin restores {org.name} before then.
      </DialogText>
      <Input
        label={`Type ${org.name} to confirm`}
        onChangeText={noop}
        size={field}
        value={org.name}
      />
    </ConfirmDialog>
  )
}
