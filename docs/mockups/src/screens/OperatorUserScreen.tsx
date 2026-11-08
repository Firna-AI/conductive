import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Ban, LockOpen } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { LiftDialog } from '../components/operator/LiftDialog'
import { OperatorPage } from '../components/operator/OperatorPage'
import { SuspendDialog } from '../components/operator/SuspendDialog'
import type { Target } from '../components/operator/targets'
import { UserDetails } from '../components/operator/UserDetails'
import { userPages } from '../fixtures/operatorPages'
import { paths } from '../paths'

export const operatorUserSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'viewer', 'dialog'],
  properties: {
    /** The user: in use, or suspended by an operator. */
    status: { enum: ['active', 'suspended'] },
    /** Whose page it is: another person's, or the operator's own. */
    viewer: { enum: ['other', 'self'] },
    /** The question before a suspension or a lift, over the page. */
    dialog: { enum: ['none', 'suspend', 'lift'] },
  },
} as const

export type OperatorUserState = SchemaProps<typeof operatorUserSchema>

/** The action of the header: Lift for a suspended user, and Suspend otherwise. */
function UserAction(props: { suspended: boolean }) {
  if (props.suspended) {
    return (
      <ScreenLink asChild to={paths.operatorUserLift}>
        <ActionButton icon={LockOpen} tone="primary">
          Lift suspension
        </ActionButton>
      </ScreenLink>
    )
  }
  return (
    <ScreenLink asChild to={paths.operatorUserSuspend}>
      <ActionButton icon={Ban} tone="danger">
        Suspend user
      </ActionButton>
    </ScreenLink>
  )
}

/**
 * The page of one user for the operator, from the Users tab: their state,
 * their details, and their orgs, with Suspend or Lift. Each asks first,
 * and Suspend warns when the page is the operator's own.
 */
export function OperatorUserScreen(props: {
  state: OperatorUserState
  viewport: Viewport
}) {
  const { status, viewer, dialog } = props.state
  const self = viewer === 'self'
  const user = self ? userPages.self : userPages[status]
  const target: Target = {
    kind: 'user',
    name: user.login,
    initials: user.initials,
  }
  const dialogs = {
    none: null,
    suspend: (
      <SuspendDialog
        cancel={paths.operatorUser}
        done={paths.operatorUserSuspended}
        self={self}
        target={target}
        viewport={props.viewport}
      />
    ),
    lift: (
      <LiftDialog
        cancel={paths.operatorUserSuspended}
        done={paths.operatorUser}
        target={target}
        viewport={props.viewport}
      />
    ),
  }
  return (
    <OperatorPage
      actions={<UserAction suspended={!self && status === 'suspended'} />}
      back={{ label: 'Users', to: paths.operatorUsers }}
      dialog={dialogs[dialog]}
      subtitle={user.name}
      tab="users"
      title={`@${user.login}`}
      viewport={props.viewport}
    >
      <UserDetails user={user} />
    </OperatorPage>
  )
}
