import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Ban, LockOpen } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { LiftDialog } from '../components/operator/LiftDialog'
import type { QuestionTarget } from '../components/operator/operatorCopy'
import { OperatorPage } from '../components/operator/OperatorPage'
import { OrgDetails } from '../components/operator/OrgDetails'
import { SuspendDialog } from '../components/operator/SuspendDialog'
import { orgPages, suspendedDeletedOrg } from '../fixtures/operatorPages'
import { paths } from '../paths'

export const operatorOrgSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'dialog'],
  properties: {
    /**
     * The org: in use, suspended by an operator, deleted by an admin, or
     * deleted by an admin and then suspended by an operator.
     */
    status: { enum: ['active', 'suspended', 'deleted', 'deleted-suspended'] },
    /** The question before a suspension or a lift, over the page. */
    dialog: { enum: ['none', 'suspend', 'lift'] },
  },
} as const

export type OperatorOrgState = SchemaProps<typeof operatorOrgSchema>

/** The pages of an org, and of its questions, in use and when deleted. */
const flows = {
  live: {
    page: paths.operatorOrg,
    suspend: paths.operatorOrgSuspend,
    suspended: paths.operatorOrgSuspended,
    lift: paths.operatorOrgLift,
  },
  deleted: {
    page: paths.operatorOrgDeleted,
    suspend: paths.operatorOrgDeletedSuspend,
    suspended: paths.operatorOrgDeletedSuspended,
    lift: paths.operatorOrgDeletedLift,
  },
} as const

type Flow = (typeof flows)[keyof typeof flows]

/**
 * The action of the header: Lift for a suspended org, and Suspend for an
 * org in use or deleted, as the operator protocol allows.
 */
function OrgAction(props: { suspended: boolean; flow: Flow }) {
  if (props.suspended) {
    return (
      <ScreenLink asChild to={props.flow.lift}>
        <ActionButton icon={LockOpen} tone="primary">
          Lift suspension
        </ActionButton>
      </ScreenLink>
    )
  }
  return (
    <ScreenLink asChild to={props.flow.suspend}>
      <ActionButton icon={Ban} tone="danger">
        Suspend org
      </ActionButton>
    </ScreenLink>
  )
}

/**
 * The page of one org for the operator, from the Orgs tab: its state, its
 * details, its workspaces, and its members, with Suspend or Lift. Each
 * asks first. The questions of a deleted org say what its deletion
 * changes.
 */
export function OperatorOrgScreen(props: {
  state: OperatorOrgState
  viewport: Viewport
}) {
  const { status, dialog } = props.state
  const org =
    status === 'deleted-suspended' ? suspendedDeletedOrg : orgPages[status]
  const flow = org.deleted ? flows.deleted : flows.live
  const target: QuestionTarget = {
    kind: 'org',
    name: org.name,
    deletion: org.deleted ? { purge: org.deleted.purge } : null,
  }
  const dialogs = {
    none: null,
    suspend: (
      <SuspendDialog
        cancel={flow.page}
        done={flow.suspended}
        target={target}
        viewport={props.viewport}
      />
    ),
    lift: (
      <LiftDialog
        cancel={flow.suspended}
        done={flow.page}
        target={target}
        viewport={props.viewport}
      />
    ),
  }
  return (
    <OperatorPage
      actions={
        <OrgAction flow={flow} suspended={org.suspension !== undefined} />
      }
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
