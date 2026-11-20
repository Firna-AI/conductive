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
 * that the last-admin rule picks. Acme is the last org of the member, so
 * Leave org opens Get started. While the leave runs, the question stays
 * open: a spinner leads Leave org, Cancel is off, and Escape and a press
 * outside do nothing.
 */
export function LeaveOrgDialog(props: {
  viewer: PersonKey
  viewport: Viewport
  /** The leave runs, so neither button takes a press. */
  busy: boolean
}) {
  const org = orgs[suspendedOrg]
  const total = workspaceList.filter(
    (item) => item.owner === props.viewer,
  ).length
  const owned = `${total} ${total === 1 ? 'workspace' : 'workspaces'}`
  const cancel = <ActionButton disabled={props.busy}>Cancel</ActionButton>
  const leave = (
    <ActionButton busy={props.busy} icon={LogOut} tone="danger">
      Leave org
    </ActionButton>
  )
  return (
    <ConfirmDialog
      actions={
        props.busy ? (
          <>
            {cancel}
            {leave}
          </>
        ) : (
          <>
            <ScreenLink asChild to={paths.suspendedLeave}>
              {cancel}
            </ScreenLink>
            <ScreenLink asChild to={paths.getStartedNoOrg}>
              {leave}
            </ScreenLink>
          </>
        )
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
