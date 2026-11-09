import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import type { ApiError } from '../../app/api/client'
import { routes } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { Dialog, DialogText } from '../ui/Dialog'
import { useAction } from '../ui/useAction'

/** What the leave does, with the count of the person's workspaces when known. */
function leaveText(orgName: string, owned: number | undefined): string {
  const lost = `You can no longer open ${orgName} or read its chats.`
  if (owned === undefined) return `${lost} Your workspaces stay in ${orgName}.`
  if (owned === 0) return lost
  if (owned === 1) return `${lost} Your workspace stays in ${orgName}.`
  return `${lost} Your ${owned} workspaces stay in ${orgName}.`
}

/**
 * The refusal of a leave. The last-admin rule refuses the leave of the
 * only active admin. A suspended org refuses a new admin too, so these
 * words name no step to take.
 */
function LeaveRefusal(props: { orgName: string; error: ApiError }) {
  const { orgName, error } = props
  const lastAdmin = error.code === 'last_admin'
  return (
    <Notice
      body={lastAdmin ? 'You are its only active admin.' : error.message}
      icon={LogOut}
      title={
        lastAdmin ? `You can't leave ${orgName}` : `You didn't leave ${orgName}`
      }
      tone="danger"
    />
  )
}

/**
 * The question before a person leaves a suspended org. The person's
 * workspaces stay in the org, with the owner that the rules of a leave
 * choose. After the leave, the app opens the person's other workspaces.
 */
function LeaveOrgDialog(props: {
  org: OrgSummary
  user: User
  close: () => void
}) {
  const { org, user } = props
  const app = useApp()
  const go = useGo()
  const model = useOrgModel(org.id)
  const workspaces = valueOf(useStore(model.workspaces))
  useEffect(() => model.watch('list'), [model])
  const leave = useAction(async () => {
    await app.leaveOrg(org.id)
    go(routes.home())
  })
  const owned = workspaces?.filter((item) => item.owner.id === user.id).length
  return (
    <Dialog
      actions={
        <>
          <ActionButton onPress={props.close}>Cancel</ActionButton>
          <ActionButton
            busy={leave.pending}
            icon={LogOut}
            onPress={() => leave.run()}
            tone="danger"
          >
            Leave org
          </ActionButton>
        </>
      }
      close={props.close}
      title={`Leave ${org.name}?`}
    >
      <DialogText>{leaveText(org.name, owned)}</DialogText>
      {leave.error ? (
        <LeaveRefusal error={leave.error} orgName={org.name} />
      ) : null}
    </Dialog>
  )
}

/**
 * Leave org, the one change of a suspended org. It shows to each person
 * whom the last-admin rule lets leave: a member who is not an admin, or an
 * admin while the org lists another admin. The API decides whether that
 * admin is active, and the dialog shows its refusal.
 */
export function LeaveOrgSection(props: { org: OrgSummary; user: User }) {
  const { org, user } = props
  const model = useOrgModel(org.id)
  const members = valueOf(useStore(model.members))
  const [confirming, setConfirming] = useState(false)
  const admin = org.role === 'admin'
  useEffect(() => (admin ? model.watch('members') : undefined), [admin, model])
  const otherAdmin =
    members?.members.some(
      (member) => member.role === 'admin' && member.user.id !== user.id,
    ) ?? false
  if (admin && !otherAdmin) return null
  return (
    <>
      <Section
        actions={
          <ActionButton
            icon={LogOut}
            onPress={() => setConfirming(true)}
            tone="danger"
          >
            Leave org
          </ActionButton>
        }
        description={`You can no longer open ${org.name}. Your workspaces stay in it.`}
        title="Leave org"
      />
      {confirming ? (
        <LeaveOrgDialog
          close={() => setConfirming(false)}
          org={org}
          user={user}
        />
      ) : null}
    </>
  )
}
