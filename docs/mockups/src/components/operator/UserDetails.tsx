import { Ban } from 'lucide-react'
import type { UserPage } from '../../fixtures/operatorPages'
import { paths } from '../../paths'
import { Notice } from '../common/Notice'
import { DetailList } from '../settings/DetailList'
import { Section } from '../settings/Section'
import { TargetList, TargetRow } from './targets'

/** The notice of a suspended user, at the top of their page. */
function UserNotice(props: { user: UserPage }) {
  const { user } = props
  if (!user.suspension) return null
  const { since, by } = user.suspension
  const name = `@${user.login}`
  return (
    <Notice
      body={`${name} cannot sign in, and no member can start the workspaces that ${name} owns. An admin can move them to another member.`}
      icon={Ban}
      title={`Suspended on ${since} by @${by}`}
    />
  )
}

/**
 * The page of a user for the operator: their state, their details, the
 * workspaces that they own, and their orgs with their roles. Each org
 * opens the page of that org.
 */
export function UserDetails(props: { user: UserPage }) {
  const { user } = props
  return (
    <>
      <UserNotice user={user} />
      <Section title="Details">
        <DetailList
          rows={[
            { term: 'GitHub ID', value: String(user.githubId), mono: true },
            { term: 'Joined', value: user.joined },
            {
              term: 'Workspaces',
              value: `${user.owned} owned, ${user.running} running`,
            },
          ]}
        />
      </Section>
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
    </>
  )
}
