import { Ban, Hourglass } from 'lucide-react'
import type { UserPage } from '../../fixtures/operatorUserPages'
import { paths } from '../../paths'
import { Notice } from '../common/Notice'
import { DetailList } from '../settings/DetailList'
import { Section } from '../settings/Section'
import { AppAccessSection, ReferralSection } from './AccessSections'
import { TargetList, TargetRow } from './targets'

/**
 * The notice at the top of the page: the suspension of a suspended user,
 * or the day when a person who waits joined the waitlist.
 */
function UserNotice(props: { user: UserPage }) {
  const { user } = props
  const name = `@${user.login}`
  if (user.suspension) {
    const { since, by } = user.suspension
    return (
      <Notice
        body={`${name} cannot sign in, and no member can start the workspaces that ${name} owns. An admin can move them to another member.`}
        icon={Ban}
        title={`Suspended on ${since} by @${by}`}
      />
    )
  }
  if (user.access.state === 'waiting') {
    return (
      <Notice
        body={`${name} sees only the waitlist screen until they get app access.`}
        icon={Hourglass}
        title={`On the waitlist since ${user.access.since}`}
      />
    )
  }
  return null
}

/**
 * The page of a user for the operator: their state, their name and other
 * details, how and when they got app access, their referral code, the
 * workspaces that they own, and their orgs with their roles. Each org
 * opens the page of that org. A user without a name on GitHub has no Name
 * row, and a person who waits has no app access, code, or org yet.
 */
export function UserDetails(props: {
  user: UserPage
  /** The question before the disable of the referral code. */
  disableCode?: string
}) {
  const { user } = props
  return (
    <>
      <UserNotice user={user} />
      <Section title="Details">
        <DetailList
          rows={[
            ...(user.name ? [{ term: 'Name', value: user.name }] : []),
            { term: 'GitHub ID', value: String(user.githubId), mono: true },
            { term: 'Joined', value: user.joined },
            {
              term: 'Workspaces',
              value: `${user.owned} owned, ${user.running} running`,
            },
          ]}
        />
      </Section>
      {user.access.state === 'granted' ? (
        <AppAccessSection access={user.access} />
      ) : null}
      {user.referral ? (
        <ReferralSection code={user.referral} disable={props.disableCode} />
      ) : null}
      {user.orgs.length > 0 ? (
        <Section title="Orgs">
          <TargetList label={`Orgs of @${user.login}`}>
            {user.orgs.map((org) => (
              <TargetRow
                end={org.role}
                key={org.name}
                target={{ kind: 'org', name: org.name, initials: org.initials }}
                to={paths.operatorOrg}
              />
            ))}
          </TargetList>
        </Section>
      ) : null}
    </>
  )
}
