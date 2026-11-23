import type { UserPage } from '../../fixtures/operatorUserPages'
import { paths } from '../../paths'
import { notice as noticePart } from '../../entries/components/common/Notice.mockup'
import { detailList } from '../../entries/components/settings/DetailList.mockup'
import { section } from '../../entries/components/settings/Section.mockup'
import { AppAccessSection, ReferralSection } from './AccessSections'
import {
  noVerifiedEmail,
  waitingNotice,
} from '../../../../../src/ui/components/operator/accessCopy'
import {
  suspendedTitle,
  suspendedUserBody,
} from '../../../../../src/ui/components/operator/operatorCopy'
import { TargetList, TargetRow } from './targets'

/**
 * The notice at the top of the page: the suspension of a suspended user,
 * or the day when a person who waits joined the waitlist.
 */
function UserNotice(props: { user: UserPage }) {
  const { user } = props
  const name = `@${user.login}`
  if (user.suspension) {
    const { since, by, stopping } = user.suspension
    return (
      <noticePart.Component
        body={suspendedUserBody(name, stopping)}
        icon="ban"
        moklyInstance="suspended-notice"
        title={suspendedTitle(since, by)}
      />
    )
  }
  if (user.access.state === 'waiting') {
    const notice = waitingNotice(name, user.access.since)
    return (
      <noticePart.Component
        body={notice.body}
        icon="hourglass"
        moklyInstance="waiting-notice"
        title={notice.title}
      />
    )
  }
  return null
}

/**
 * The page of a user for the operator: their state, their name and other
 * details with the age of the GitHub account, the time of their last new
 * workspace or sent message, how and when they got app access, their
 * referral code, the workspaces that they own, and their orgs with their
 * roles. Each org opens the page of that org. A user
 * without a name on GitHub has no Name row, and a person who waits has no
 * app access, code, or org yet. The Email row gives the primary verified
 * email on GitHub, or says that the account has none.
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
      <section.Component moklyInstance="details-section" title="Details">
        <detailList.Component
          moklyInstance="user-details-list"
          rows={[
            ...(user.name ? [{ term: 'Name', value: user.name }] : []),
            { term: 'Email', value: user.email ?? noVerifiedEmail },
            { term: 'GitHub ID', value: String(user.githubId), mono: true },
            { term: 'On GitHub', value: user.githubAge },
            { term: 'Joined', value: user.joined },
            { term: 'Last active', value: user.lastActive ?? 'Unknown' },
            {
              term: 'Workspaces',
              value: `${user.owned} owned, ${user.running} running`,
            },
          ]}
        />
      </section.Component>
      {user.access.state === 'granted' ? (
        <AppAccessSection access={user.access} />
      ) : null}
      {user.referral ? (
        <ReferralSection code={user.referral} disable={props.disableCode} />
      ) : null}
      {user.orgs.length > 0 ? (
        <section.Component moklyInstance="orgs-section" title="Orgs">
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
        </section.Component>
      ) : null}
    </>
  )
}
