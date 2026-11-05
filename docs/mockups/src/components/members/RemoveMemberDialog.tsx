import type { Viewport } from '@mokly/mokly'
import { people, removedMember } from '../../fixtures/members'
import { orgs } from '../../fixtures/orgs'
import { workspaceList } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'

/**
 * The owner confirms that a member leaves the org. The member's workspaces
 * move to the owner who removes them, so no workspace is left without an
 * owner.
 */
export function RemoveMemberDialog(props: { viewport: Viewport }) {
  const person = people[removedMember]
  const first = person.name.split(' ')[0]
  const owned = workspaceList.filter(
    (item) => item.owner === removedMember,
  ).length
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.members}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ActionButton tone="danger">Remove member</ActionButton>
        </>
      }
      title={`Remove ${person.name} from ${orgs.acme.name}?`}
      viewport={props.viewport}
    >
      <DialogText>
        {first} can no longer open {orgs.acme.name}. {first}&apos;s {owned}{' '}
        workspaces move to you, and their agents then use your accounts.
      </DialogText>
    </ConfirmDialog>
  )
}
