import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Ban, LockOpen } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { LiftDialog } from '../components/operator/LiftDialog'
import { OperatorPage } from '../components/operator/OperatorPage'
import { OrgDetails } from '../components/operator/OrgDetails'
import { SuspendDialog } from '../components/operator/SuspendDialog'
import type { Target } from '../components/operator/targets'
import { orgPages } from '../fixtures/operatorPages'
import { paths } from '../paths'

export const operatorOrgSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'dialog'],
  properties: {
    /** The org: in use, suspended by an operator, or deleted by an admin. */
    status: { enum: ['active', 'suspended', 'deleted'] },
    /** The question before a suspension or a lift, over the page. */
    dialog: { enum: ['none', 'suspend', 'lift'] },
  },
} as const

export type OperatorOrgState = SchemaProps<typeof operatorOrgSchema>

/**
 * The action of the header: Lift for a suspended org, and Suspend for an
 * org in use or deleted, as the operator protocol allows.
 */
function OrgAction(props: { suspended: boolean }) {
  if (props.suspended) {
    return (
      <ScreenLink asChild to={paths.operatorOrgLift}>
        <ActionButton icon={LockOpen} tone="primary">
          Lift suspension
        </ActionButton>
      </ScreenLink>
    )
  }
  return (
    <ScreenLink asChild to={paths.operatorOrgSuspend}>
      <ActionButton icon={Ban} tone="danger">
        Suspend org
      </ActionButton>
    </ScreenLink>
  )
}

/**
 * The page of one org for the operator, from the Orgs tab: its state, its
 * details, its workspaces, and its members, with Suspend or Lift. Each
 * asks first.
 */
export function OperatorOrgScreen(props: {
  state: OperatorOrgState
  viewport: Viewport
}) {
  const { status, dialog } = props.state
  const org = orgPages[status]
  const target: Target = { kind: 'org', name: org.name, initials: org.initials }
  const dialogs = {
    none: null,
    suspend: (
      <SuspendDialog
        cancel={paths.operatorOrg}
        done={paths.operatorOrgSuspended}
        target={target}
        viewport={props.viewport}
      />
    ),
    lift: (
      <LiftDialog
        cancel={paths.operatorOrgSuspended}
        done={paths.operatorOrg}
        target={target}
        viewport={props.viewport}
      />
    ),
  }
  return (
    <OperatorPage
      actions={<OrgAction suspended={status === 'suspended'} />}
      back={{ label: 'Orgs', to: paths.operatorOrgs }}
      dialog={dialogs[dialog]}
      subtitle="Org"
      tab="orgs"
      title={org.name}
      viewport={props.viewport}
    >
      <OrgDetails org={org} />
    </OperatorPage>
  )
}
