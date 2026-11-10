import { Check } from 'lucide-react'
import { useToast } from '@firna/ui/toast'
import type { QuestionTarget } from '../../../docs/mockups/src/components/operator/operatorCopy'
import { readOperatorUser } from '../../app/api/read-operator-pages'
import { approveUser, disableCode } from '../../app/operator-access'
import { OperatorTarget } from '../../app/operator-target'
import { routes } from '../../app/router'
import { asApiError } from '../../app/store'
import {
  operatorUserPath,
  userSuspensionPath,
  type OperatorUserDetail,
} from '../../shared/operator'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { Loaded } from '../settings/LoadState'
import { ApproveDialog } from './ApproveDialog'
import { DisableCodeDialog } from './CodeDialogs'
import { OperatorPage } from './OperatorPage'
import { LiftDialog, SuspendDialog } from './TargetDialogs'
import { TargetAction, useTargetPage, type Question } from './TargetPage'
import { UserDetails } from './UserDetails'

/**
 * The actions of the header: Suspend user, or Lift for a suspended user.
 * A person who waits also has Approve, unless a suspension holds them.
 */
function UserActions(props: {
  user: OperatorUserDetail
  ask: (question: Question) => void
}) {
  const { user, ask } = props
  const suspended = user.suspension !== null
  return (
    <>
      <TargetAction ask={ask} kind="user" suspended={suspended} />
      {user.appAccess.state === 'waiting' && !suspended ? (
        <ActionButton
          icon={Check}
          onPress={() => ask('approve')}
          tone="primary"
        >
          Approve
        </ActionButton>
      ) : null}
    </>
  )
}

/**
 * The page of one user, from the Users tab or a link, with Suspend, or Lift
 * for a suspended user, and Approve for a person who waits. On the
 * operator's own page, the question before a suspension warns first. The
 * question before the suspension of a user whose referral code still lets
 * people in offers to disable it too. After each write, the page reads the
 * user again.
 */
export function UserPage(props: { githubId: number; self: boolean }) {
  const app = useApp()
  const { toast } = useToast()
  const page = useTargetPage(
    () =>
      new OperatorTarget(
        app,
        {
          page: operatorUserPath(props.githubId),
          suspension: userSuspensionPath(props.githubId),
        },
        readOperatorUser,
        props.self,
      ),
  )
  const { target, detail, question, ask } = page
  const user = detail.state === 'ready' ? detail.value : null
  const named: QuestionTarget | null = user
    ? { kind: 'user', name: `@${user.login}` }
    : null
  const code = user?.referralCode ?? null
  const active = code?.state === 'active' ? code : null
  const close = () => ask(null)
  /**
   * Suspends the user, and then disables the referral code when the
   * operator kept the offer on. A suspension of the operator's own account
   * ends the session, so there the code goes first. A failed disable after
   * the suspension names what failed, and the page still shows the code.
   */
  const suspend = async (disable: boolean) => {
    if (!disable || !active) return target.suspend()
    if (props.self) {
      await disableCode(app, active.code)
      return target.suspend()
    }
    await target.suspend()
    try {
      await disableCode(app, active.code)
    } catch (error) {
      toast({
        title: `The referral code of ${named?.name ?? 'the user'} wasn't disabled`,
        description: asApiError(error).message,
        tone: 'error',
      })
      return
    }
    await target.detail.refresh()
  }
  const approve = async () => {
    await approveUser(app, props.githubId)
    await target.detail.refresh()
  }
  const disableReferral = async (text: string) => {
    await disableCode(app, text)
    await target.detail.refresh()
  }
  return (
    <OperatorPage
      actions={user ? <UserActions ask={ask} user={user} /> : undefined}
      back={{ label: 'Users', to: routes.operatorUsers() }}
      subtitle={user?.name ?? undefined}
      tab="users"
      title={user ? `@${user.login}` : 'User'}
    >
      <Loaded
        failure="The user could not load"
        retry={() => target.detail.refresh()}
        value={detail}
      >
        {(value) => (
          <UserDetails
            disableCode={() => ask('disable-code')}
            stopping={page.stopping}
            user={value}
          />
        )}
      </Loaded>
      {named && question === 'suspend' ? (
        <SuspendDialog
          close={close}
          referralCode={active?.code}
          self={props.self}
          suspend={suspend}
          target={named}
        />
      ) : null}
      {named && question === 'lift' ? (
        <LiftDialog close={close} lift={() => target.lift()} target={named} />
      ) : null}
      {user && question === 'approve' ? (
        <ApproveDialog
          approve={approve}
          close={close}
          person={{
            login: user.login,
            name: user.name,
            verifiedEmail: user.hasVerifiedEmail,
          }}
        />
      ) : null}
      {active && question === 'disable-code' ? (
        <DisableCodeDialog
          close={close}
          code={active}
          disable={() => disableReferral(active.code)}
        />
      ) : null}
    </OperatorPage>
  )
}
