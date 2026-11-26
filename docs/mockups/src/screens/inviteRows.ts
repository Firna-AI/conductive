import { orgLinks } from '../components/orgs/orgLinks'
import type { PendingInviteData } from '../entries/components/members/PendingInvites.mockup'
import type { PendingInvite } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'

/**
 * The rows of the org invitations that wait for a person, as the data of
 * the registered list: each org with the email that it invited, and its
 * Accept invitation, which joins the org and opens it when the mockups
 * draw it. `tone` makes Accept the main action of a screen.
 */
export function inviteRows(
  invites: readonly PendingInvite[],
  tone: PendingInviteData['accept']['tone'] = 'secondary',
): PendingInviteData[] {
  return invites.map((invite) => {
    const org = orgs[invite.org]
    const to = orgLinks[org.key]
    return {
      id: org.key,
      orgName: org.name,
      email: invite.email,
      accept: { tone, ...(to ? { to } : {}) },
    }
  })
}
