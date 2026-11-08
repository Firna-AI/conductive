import type { Viewport } from '@mokly/mokly'
import { LogOut } from 'lucide-react'
import type { PersonKey } from '../../fixtures/members'
import { orgs, suspendedOrg } from '../../fixtures/orgs'
import { workspaceList } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'

/**
 * A member confirms that they leave a suspended org. They lose access to
 * it and to its chats. Their workspaces stay in the org, with the owner
 * that the last-admin rule picks.
 */
export function LeaveOrgDialog(props: {
  viewer: PersonKey
  viewport: Viewport
}) {
  const org = orgs[suspendedOrg]
  const total = workspaceList.filter(
    (item) => item.owner === props.viewer,
  ).length
  const owned = `${total} ${total === 1 ? 'workspace' : 'workspaces'}`
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.suspendedLeave}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ActionButton icon={LogOut} tone="danger">
            Leave org
          </ActionButton>
        </>
      }
      title={`Leave ${org.name}?`}
      viewport={props.viewport}
    >
      <DialogText>
        You can no longer open {org.name} or read its chats. Your {owned} stay
        in {org.name}.
      </DialogText>
    </ConfirmDialog>
  )
}
