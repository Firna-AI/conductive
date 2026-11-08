import { OwnerPicker } from '../../members/OwnerPicker'
import { useOrgAccess } from '../context'
import { useMembersApi } from '../settings/members-api'
import type { WorkspaceContext } from './features'

/**
 * The owner of the workspace in its header, from the members UI. An admin
 * opens the members of the org and picks another owner. Another member
 * sees the owner only, and so does everyone in a suspended org. The answer
 * goes to `onReassigned` of the context: the open workspace takes its new
 * owner, and the list of the org gets the same record. So the header, the
 * start state, Archive, and the sidebar follow at once. A new owner changes
 * no login and keeps the cloud computer running.
 */
export function WorkspaceOwner(props: { context: WorkspaceContext }) {
  const { context } = props
  const { role, suspended } = useOrgAccess(context.org)
  return (
    <OwnerPicker
      api={useMembersApi(context.org.id)}
      canReassign={role === 'admin' && !suspended}
      onReassigned={context.onReassigned}
      viewport={context.viewport === 'phone' ? 'mobile' : 'desktop'}
      workspace={context.workspace}
    />
  )
}
