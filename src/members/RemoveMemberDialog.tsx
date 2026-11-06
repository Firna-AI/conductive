import { CircleAlert } from 'lucide-react'
import type { OrgMember } from '../shared/members'
import { firstName, personName } from './people'
import { ActionButton } from './ui/actions'
import { ConfirmDialog, DialogText } from './ui/ConfirmDialog'
import { Notice } from './ui/Notice'

/** What happens to the workspaces of the member who leaves. */
function movedWorkspaces(first: string, owned: number): string {
  if (owned === 0) return ''
  if (owned === 1) return ` ${first}'s workspace moves to you.`
  return ` ${first}'s ${owned} workspaces move to you.`
}

/**
 * An admin confirms that a member leaves the org. The member's workspaces
 * move to the admin who removes them, so no workspace is left without an
 * owner (decision 39). While the removal runs, the question stays open. A
 * failed removal shows its reason, and the admin can press Remove member
 * again.
 */
export function RemoveMemberDialog(props: {
  member: OrgMember
  orgName: string
  /** The number of workspaces that the member owns. */
  owned: number
  busy: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const { user } = props.member
  const name = personName(user)
  const first = firstName(user)
  return (
    <ConfirmDialog
      action={
        <ActionButton busy={props.busy} onPress={props.onConfirm} tone="danger">
          Remove member
        </ActionButton>
      }
      busy={props.busy}
      onCancel={props.onCancel}
      title={`Remove ${name} from ${props.orgName}?`}
    >
      <DialogText>
        {first} can no longer open {props.orgName}.
        {movedWorkspaces(first, props.owned)}
      </DialogText>
      {props.error ? (
        <Notice
          body={props.error}
          icon={CircleAlert}
          title={`${name} is still a member`}
          tone="danger"
        />
      ) : null}
    </ConfirmDialog>
  )
}
