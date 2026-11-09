import { Ban, Hourglass } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { waitingNotice } from '../../../docs/mockups/src/components/operator/accessCopy'
import { suspendedUserBody } from '../../../docs/mockups/src/components/operator/operatorCopy'
import { DetailList } from '../../../docs/mockups/src/components/settings/DetailList'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import { roleLabels } from '../../members/people'
import type { OperatorUserDetail } from '../../shared/operator'
import { AppAccessSection, ReferralSection } from './AccessSections'
import { formatAge, formatCount, formatLongDay } from './format'
import { suspensionTitle } from './TargetPage'
import { EmptyRows, TargetList, TargetRow } from './TargetParts'

/**
 * The notice at the top of the page: the suspension of a suspended user,
 * or the day when a person who waits joined the waitlist.
 */
function UserNotice(props: {
  user: OperatorUserDetail
  stopping: number | null
}) {
  const { user } = props
  const { now, timeZone } = useServices()
  const name = `@${user.login}`
  if (user.suspension) {
    return (
      <Notice
        body={suspendedUserBody(name, props.stopping ?? 0)}
        icon={Ban}
        title={suspensionTitle(user.suspension, now(), timeZone)}
      />
    )
  }
  if (user.appAccess.state !== 'waiting') return null
  const since = formatLongDay(user.appAccess.waitingSince, timeZone)
  const notice = waitingNotice(name, since)
  return <Notice body={notice.body} icon={Hourglass} title={notice.title} />
}

/**
 * The page of a user for the operator: their state, their name and other
 * details with the age of the GitHub account, how and when they got app
 * access, their referral code, the workspaces that they own, and their orgs
 * with their roles. Each org opens the page of that org. A user without a
 * name on GitHub has no Name row. A person who waits has no Orgs box while
 * they have no org, and a user with app access says where their orgs show.
 */
export function UserDetails(props: {
  user: OperatorUserDetail
  stopping: number | null
  /** Asks the question before the disable of the referral code. */
  disableCode: () => void
}) {
  const { user } = props
  const { now, timeZone } = useServices()
  const { total, running } = user.workspaces
  const age =
    user.githubCreatedAt === null
      ? 'Unknown'
      : formatAge(user.githubCreatedAt, now())
  return (
    <>
      <UserNotice stopping={props.stopping} user={user} />
      <Section title="Details">
        <DetailList
          rows={[
            ...(user.name ? [{ term: 'Name', value: user.name }] : []),
            { term: 'GitHub ID', value: String(user.githubId), mono: true },
            { term: 'On GitHub', value: age },
            { term: 'Joined', value: formatLongDay(user.joinedAt, timeZone) },
            {
              term: 'Workspaces',
              value: `${formatCount(total)} owned, ${formatCount(running)} running`,
            },
          ]}
        />
      </Section>
      <AppAccessSection user={user} />
      <ReferralSection disable={props.disableCode} user={user} />
      {user.orgs.length > 0 || user.appAccess.state !== 'waiting' ? (
        <Section title="Orgs">
          {user.orgs.length === 0 ? (
            <EmptyRows>{`The orgs of @${user.login} show here.`}</EmptyRows>
          ) : (
            <TargetList label={`Orgs of @${user.login}`}>
              {user.orgs.map((org) => (
                <TargetRow
                  end={roleLabels[org.role]}
                  key={org.id}
                  target={{
                    kind: 'org',
                    name: org.name,
                    initials: org.initials,
                  }}
                  to={routes.operatorOrg(org.id)}
                />
              ))}
            </TargetList>
          )}
        </Section>
      ) : null}
    </>
  )
}
