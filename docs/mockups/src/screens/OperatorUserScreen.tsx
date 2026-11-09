import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Ban, Check, LockOpen } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { ApproveDialog } from '../components/operator/ApproveDialog'
import { DisableCodeDialog } from '../components/operator/codeDialogs'
import { LiftDialog } from '../components/operator/LiftDialog'
import { OperatorPage } from '../components/operator/OperatorPage'
import { SuspendDialog } from '../components/operator/SuspendDialog'
import type { Target } from '../components/operator/targets'
import { UserDetails } from '../components/operator/UserDetails'
import { accessPages } from '../fixtures/operatorAccessPages'
import { userPages, type UserPage } from '../fixtures/operatorUserPages'
import { paths } from '../paths'

export const operatorUserSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['page', 'dialog'],
  properties: {
    /**
     * Whose page, in which state: Dana Kim in use, after the disable of
     * her referral code, or suspended; the operator's own; Sam Okafor on
     * the waitlist, approved with the email not sent yet, or sent; a user
     * who came in by an invite code, a referral code, an org invitation,
     * or as an operator; and an approval whose email never went.
     */
    page: {
      enum: [
        'active',
        'codeDisabled',
        'suspended',
        'self',
        'waiting',
        'approved',
        'emailed',
        'inviteCode',
        'referralCode',
        'orgInvitation',
        'operator',
        'emailNotSent',
      ],
    },
    /**
     * The question before a suspension, a lift, an approval, or the
     * disable of the referral code, over the page.
     */
    dialog: { enum: ['none', 'suspend', 'lift', 'approve', 'disable'] },
  },
} as const

export type OperatorUserState = SchemaProps<typeof operatorUserSchema>

type PageKey = OperatorUserState['page']

const pages: Readonly<Record<PageKey, UserPage>> = {
  ...userPages,
  ...accessPages,
}

/** The question of Suspend user, for the pages that draw it. */
function suspendPath(page: PageKey): string | undefined {
  if (page === 'active') return paths.operatorUserSuspend
  if (page === 'self') return paths.operatorUserSuspendSelf
  return undefined
}

/**
 * The actions of the header: Lift for a suspended user, and Suspend
 * otherwise. A person who waits also has Approve.
 */
function UserActions(props: { page: PageKey; user: UserPage }) {
  if (props.user.suspension) {
    return (
      <ScreenLink asChild to={paths.operatorUserLift}>
        <ActionButton icon={LockOpen} tone="primary">
          Lift suspension
        </ActionButton>
      </ScreenLink>
    )
  }
  const button = (
    <ActionButton icon={Ban} tone="danger">
      Suspend user
    </ActionButton>
  )
  const to = suspendPath(props.page)
  const suspend = to ? (
    <ScreenLink asChild to={to}>
      {button}
    </ScreenLink>
  ) : (
    button
  )
  if (props.user.access.state !== 'waiting') return suspend
  return (
    <>
      {suspend}
      <ScreenLink asChild to={paths.operatorUserApprove}>
        <ActionButton icon={Check} tone="primary">
          Approve
        </ActionButton>
      </ScreenLink>
    </>
  )
}

function UserDialog(props: {
  state: OperatorUserState
  user: UserPage
  viewport: Viewport
}) {
  const { user, viewport } = props
  const target: Target = {
    kind: 'user',
    name: user.login,
    initials: user.initials,
  }
  const referral =
    user.referral && !user.referral.disabled ? user.referral : undefined
  switch (props.state.dialog) {
    case 'none':
      return null
    case 'suspend':
      return (
        <SuspendDialog
          cancel={paths.operatorUser}
          done={paths.operatorUserSuspended}
          referral={referral?.code}
          self={props.state.page === 'self'}
          target={target}
          viewport={viewport}
        />
      )
    case 'lift':
      return (
        <LiftDialog
          cancel={paths.operatorUserSuspended}
          done={paths.operatorUser}
          target={target}
          viewport={viewport}
        />
      )
    case 'approve':
      return (
        <ApproveDialog
          cancel={paths.operatorUserWaiting}
          done={paths.operatorUserApproved}
          person={user}
          viewport={viewport}
        />
      )
    case 'disable':
      if (!referral) return null
      return (
        <DisableCodeDialog
          cancel={paths.operatorUser}
          code={referral.code}
          done={paths.operatorUserCodeDisabled}
          kind="referral"
          title={`Disable the referral code of @${user.login}?`}
          used={referral.usedBy.length}
          viewport={viewport}
        />
      )
  }
}

/**
 * The page of one user for the operator, from the Users tab: their state,
 * their details, their app access, their referral code, and their orgs,
 * with Suspend or Lift, and Approve for a person who waits. Each asks
 * first, and Suspend warns when the page is the operator's own.
 */
export function OperatorUserScreen(props: {
  state: OperatorUserState
  viewport: Viewport
}) {
  const { page } = props.state
  const user = pages[page]
  return (
    <OperatorPage
      actions={<UserActions page={page} user={user} />}
      back={{ label: 'Users', to: paths.operatorUsers }}
      dialog={
        <UserDialog state={props.state} user={user} viewport={props.viewport} />
      }
      subtitle={user.name}
      tab="users"
      title={`@${user.login}`}
      viewport={props.viewport}
    >
      <UserDetails
        disableCode={
          page === 'active' ? paths.operatorUserDisableCode : undefined
        }
        user={user}
      />
    </OperatorPage>
  )
}
