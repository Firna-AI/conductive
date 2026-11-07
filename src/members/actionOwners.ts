import type {
  MembersAction,
  MembersData,
  MembersFailures,
} from './membersStore'

type ActionOwner = 'member' | 'invite' | 'none'

const actionOwners: Record<MembersAction, ActionOwner> = {
  invite: 'none',
  role: 'member',
  remove: 'member',
  cancel: 'invite',
}

/** Ends failures and removal questions when their loaded owner leaves. */
export function keepExistingOwners(
  data: MembersData,
  failures: MembersFailures,
  removing: string | null,
) {
  const owners = {
    member: new Set(data.members.map((member) => member.user.id)),
    invite: new Set(data.invites.map((invite) => invite.id)),
  }
  return {
    failures: new Map(
      [...failures].filter(([, failure]) => {
        const owner = actionOwners[failure.action]
        return owner === 'none' || owners[owner].has(failure.target)
      }),
    ),
    removing:
      removing !== null && owners.member.has(removing) ? removing : null,
  }
}
