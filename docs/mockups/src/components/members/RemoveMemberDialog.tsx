import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { people, removedMember } from '../../fixtures/members'
import { orgs } from '../../fixtures/orgs'
import { workspaceList } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { ScreenLink } from '../common/ScreenLink'

/**
 * An admin confirms that a member leaves the org. The member's workspaces
 * move to the admin who removes them, so no workspace is left without an
 * owner (decision 39).
 */
export function RemoveMemberDialog(props: { viewport: Viewport }) {
  const person = people[removedMember]
  const first = person.name.split(' ')[0]
  const owned = workspaceList.filter(
    (item) => item.owner === removedMember,
  ).length
  return (
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={paths.members}>
            <actionButton.Component moklyInstance="dialog-cancel">
              Cancel
            </actionButton.Component>
          </ScreenLink>
          <actionButton.Component
            moklyInstance="dialog-remove-member"
            tone="danger"
          >
            Remove member
          </actionButton.Component>
        </>
      }
      moklyInstance="remove-member-dialog"
      title={`Remove ${person.name} from ${orgs.acme.name}?`}
      viewport={props.viewport}
    >
      <dialogText.Component>
        {first} can no longer open {orgs.acme.name}. {first}&apos;s {owned}{' '}
        workspaces move to you.
      </dialogText.Component>
    </confirmDialog.Component>
  )
}
