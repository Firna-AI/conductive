import { ActionButton, type ActionTone } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import type { PendingInviteRow } from '../components/members/PendingInvites'
import { orgLinks } from '../components/orgs/orgLinks'
import type { PendingInvite } from '../fixtures/members'
import { orgs, type Org } from '../fixtures/orgs'

/** Accept invitation of one org. It opens the org when the mockups draw it. */
function Accept(props: { org: Org; tone: ActionTone }) {
  const button = (
    <ActionButton
      accessibilityLabel={`Accept the invitation to ${props.org.name}`}
      tone={props.tone}
    >
      Accept invitation
    </ActionButton>
  )
  const to = orgLinks[props.org.key]
  if (!to) return button
  return (
    <ScreenLink asChild to={to}>
      {button}
    </ScreenLink>
  )
}

/**
 * The rows of the org invitations that wait for a person: each org with
 * the email that it invited, and Accept invitation, which joins the org
 * and opens it. `tone` makes Accept the main action of a screen.
 */
export function inviteRows(
  invites: readonly PendingInvite[],
  tone: ActionTone = 'secondary',
): PendingInviteRow[] {
  return invites.map((invite) => {
    const org = orgs[invite.org]
    return {
      id: org.key,
      orgName: org.name,
      email: invite.email,
      accept: <Accept org={org} tone={tone} />,
    }
  })
}
