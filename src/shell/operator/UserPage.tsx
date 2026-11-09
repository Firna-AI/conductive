import { Ban } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { suspendedUserBody } from '../../../docs/mockups/src/components/operator/operatorCopy'
import { DetailList } from '../../../docs/mockups/src/components/settings/DetailList'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { readOperatorUser } from '../../app/api/read-operator-pages'
import { OperatorTarget } from '../../app/operator-target'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import { roleLabels } from '../../members/people'
import {
  operatorUserPath,
  userSuspensionPath,
  type OperatorUserDetail,
} from '../../shared/operator'
import { useApp } from '../context'
import { Loaded } from '../settings/LoadState'
import { formatCount, formatLongDay } from './format'
import { OperatorPage } from './OperatorPage'
import { LiftDialog, SuspendDialog } from './TargetDialogs'
import { suspensionTitle, TargetAction, useTargetPage } from './TargetPage'
import { EmptyRows, TargetList, TargetRow, type Target } from './TargetParts'

/** The notice of a suspended user, at the top of their page. */
function UserNotice(props: {
  user: OperatorUserDetail
  stopping: number | null
}) {
  const { user } = props
  const { now, timeZone } = useServices()
  if (!user.suspension) return null
  return (
    <Notice
      body={suspendedUserBody(`@${user.login}`, props.stopping ?? 0)}
      icon={Ban}
      title={suspensionTitle(user.suspension, now(), timeZone)}
    />
  )
}

/**
 * The page of a user for the operator: their state, their name and other
 * details, the workspaces that they own, and their orgs with their roles. Each
 * org opens the page of that org. A user without a name on GitHub has no Name
 * row.
 */
function UserDetails(props: {
  user: OperatorUserDetail
  stopping: number | null
}) {
  const { user } = props
  const { timeZone } = useServices()
  const { total, running } = user.workspaces
  return (
    <>
      <UserNotice stopping={props.stopping} user={user} />
      <Section title="Details">
        <DetailList
          rows={[
            ...(user.name ? [{ term: 'Name', value: user.name }] : []),
            { term: 'GitHub ID', value: String(user.githubId), mono: true },
            { term: 'Joined', value: formatLongDay(user.joinedAt, timeZone) },
            {
              term: 'Workspaces',
              value: `${formatCount(total)} owned, ${formatCount(running)} running`,
            },
          ]}
        />
      </Section>
      <Section title="Orgs">
        {user.orgs.length === 0 ? (
          <EmptyRows>{`The orgs of @${user.login} show here.`}</EmptyRows>
        ) : (
          <TargetList label={`Orgs of @${user.login}`}>
            {user.orgs.map((org) => (
              <TargetRow
                end={roleLabels[org.role]}
                key={org.id}
                target={{ kind: 'org', name: org.name, initials: org.initials }}
                to={routes.operatorOrg(org.id)}
              />
            ))}
          </TargetList>
        )}
      </Section>
    </>
  )
}

/**
 * The page of one user, from the Users tab or a link, with Suspend, or Lift for
 * a suspended user. On the operator's own page, the question before a
 * suspension warns first. After either, the page reads the user again.
 */
export function UserPage(props: { githubId: number; self: boolean }) {
  const app = useApp()
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
  const named: Target | null = user
    ? { kind: 'user', login: user.login, name: user.name }
    : null
  const close = () => ask(null)
  return (
    <OperatorPage
      actions={
        user ? (
          <TargetAction
            ask={ask}
            kind="user"
            suspended={user.suspension !== null}
          />
        ) : undefined
      }
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
        {(value) => <UserDetails stopping={page.stopping} user={value} />}
      </Loaded>
      {named && question === 'suspend' ? (
        <SuspendDialog
          close={close}
          self={props.self}
          suspend={() => target.suspend()}
          target={named}
        />
      ) : null}
      {named && question === 'lift' ? (
        <LiftDialog close={close} lift={() => target.lift()} target={named} />
      ) : null}
    </OperatorPage>
  )
}
