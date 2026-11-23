import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { Input } from '@firna/ui/input'
import { deletedOrg, orgs } from '../../fixtures/orgs'
import { noop } from '../../../../../src/ui/noop'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'

/**
 * An admin confirms Delete org by typing the name of the org. The dialog
 * says what happens at once, the date when everything is deleted, and
 * where an admin restores the org. Delete org then opens the next org that
 * is not deleted, which the mockups do not draw.
 */
export function DeleteOrgDialog(props: { viewport: Viewport }) {
  const { field } = useControlSizes()
  const org = orgs[deletedOrg.org]
  return (
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={paths.orgSettings}>
            <actionButton.Component moklyInstance="dialog-cancel">
              Cancel
            </actionButton.Component>
          </ScreenLink>
          <actionButton.Component
            icon="trash-2"
            moklyInstance="dialog-delete-org"
            tone="danger"
          >
            Delete org
          </actionButton.Component>
        </>
      }
      moklyInstance="delete-org-dialog"
      title={`Delete ${org.name}?`}
      viewport={props.viewport}
    >
      <dialogText.Component>
        Every cloud computer of {org.name} stops now, and its members can no
        longer open it. Everything is deleted on {deletedOrg.deletes}, unless an
        admin restores {org.name} from Account settings before then.
      </dialogText.Component>
      <Input
        label={`Type ${org.name} to confirm`}
        onChangeText={noop}
        size={field}
        value={org.name}
      />
    </confirmDialog.Component>
  )
}
