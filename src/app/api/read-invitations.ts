import type { PendingOrgInvite } from '../../shared/members'
import type { OrgSummary } from '../../shared/orgs'
import { count, items, nested, record, text } from './parse'
import { readOrg } from './read-core'

function readPendingInvite(value: unknown): PendingOrgInvite {
  const invite = record(value, 'invite')
  return {
    id: text(invite, 'id'),
    email: text(invite, 'email'),
    createdAt: count(invite, 'createdAt'),
    orgId: text(invite, 'orgId'),
    orgName: text(invite, 'orgName'),
  }
}

/** The invitations that wait for the signed-in user, from `PendingOrgInvitesResponse`. */
export function readPendingInvites(value: unknown): PendingOrgInvite[] {
  return items(record(value, 'invites'), 'invites', readPendingInvite)
}

/**
 * The org that an accepted invitation joined, from `AcceptOrgInviteResponse`.
 * The Worker answers with the org as the list of orgs shows it, so saved
 * initials come along when the org has them.
 */
export function readAcceptedOrg(value: unknown): OrgSummary {
  return nested(record(value, 'accept'), 'org', readOrg)
}
