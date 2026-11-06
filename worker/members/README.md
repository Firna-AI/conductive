# Members backend

This area implements org roles, invitations, workspace responsibility, and
Delete org. It uses the fixed browser contracts in
[shared types](../../src/shared/README.md).
The main Worker does not dispatch these handlers yet.

## Integration

Run `membersGate` before feature dispatch on the app hostname.
It calls the existing gate for sign-in, hostname, Origin, and JSON checks.
It then reads current membership from D1.
It permits a deleted org only for its admins on its detail, Delete retry,
and Restore paths. It also checks admin permission on shared-settings writes.
Use `membersRoute` before the current core dispatcher.
An unmatched route returns `null` for the next handler.
Keep the existing private response headers and error handler around dispatch.

The routes use paths from `src/shared/members.ts` and `orgs.ts`.
They serve member lists, invitation creation and cancellation, role changes,
removal, leave, workspace reassignment, org rename, Delete, and Restore.
Shared-settings persistence remains with the settings backend.
That backend must call `assertCanChangeSharedSettings` before writes.
It must also include `activeAdminPredicate` in its D1 mutation.
Bind the org ID and actor ID for that predicate.
This keeps a concurrent role change or deletion from permitting a stale write.

Supply all three `MembersHooks` callbacks:

- `readWorkspace` returns the lifecycle backend's current `Workspace` record.
  It must authorize the viewer. All current org members can read all workspaces.
- `suspendOrg` stops org access before resource enumeration.
  It must reject new starts and writes for the deleted org.
  It must drain pending workspace starts and image builds.
  It must retain their sandbox IDs and snapshot names in D1.
  It must close existing browser and runner access.
  It must disable idle, refresh, and disk keepalive timers.
  It must handle builds even when the workspace list is empty.
  It must finish before it returns. Repeated calls must be safe.
  A later explicit workspace open can restore access after an active-org check.
- `deleteWorkspaceState` removes all workspace Durable Object state and any
  other external workspace data. Repeated calls must be safe.

Delete records the deletion date and revokes previews before it calls a hook
or the provider. A failed suspension or stop keeps that state for retry.
Restore finishes outstanding stops and clears the deletion marker.
Restore makes no provider resume call. Old preview hostnames stay revoked.

Schedule `cleanupDeletedOrgs` with `suspendOrg` and `deleteWorkspaceState`.
It retries stops during the restore window.
After seven days, it removes all recorded org-image and build snapshots
before any sandbox deletion. It then removes workspace state and D1 rows.
The resource journal keeps completed steps after a failure.
The result names purged orgs and orgs that need another attempt.
D1 ownership and encrypted keys stay until every external cleanup succeeds.
A cleanup lease separates Restore from cleanup calls.
An expired lease permits a later attempt after a worker stops.

Invitation acceptance has no browser route in the fixed contracts.
Call `acceptOrgInvite` after an explicit acceptance by a signed-in user.
It verifies the invite ID against that user's current stored GitHub login.
Sign-in alone does not accept an invitation.

Call `workspaceCreator` when the lifecycle creates a workspace.
Store its ID in `owner_user_id` in the creation transaction.
Reassignment changes the owner and update time only.
The sender's agent login stays with the turn runner.

Account deletion must call `assertCanDeleteAccount` first.
Its final D1 mutation must also use `accountDeletionAllowedPredicate`.
Bind the departing user's ID for that predicate.
The account backend owns its membership departures and other user references.
The guard permits the final admin's account deletion only after org deletion.

## Development

Run `npm run test -- worker/members` from the repository root with Node 24.
The tests use local D1, the real request gate, and the existing fake Boat server.

### Key Code

- `gate.ts` extends the request gate for deleted-org access and shared writes.
- `route.ts` defines HTTP dispatch and the required integration hooks.
- `membership.ts` manages roles, removal, leave, and the last-admin rule.
- `invites.ts` manages pending invitations and explicit acceptance.
- `ownership.ts` supplies creation ownership and workspace reassignment.
- `deletion.ts` implements Delete, Restore, suspension, and provider stops.
- `cleanup.ts` implements scheduled provider and data cleanup.
- `account.ts` exposes the last-admin account-deletion guard.
- `*-data.ts` owns the D1 queries and the guarded mutation predicates.

### Related Docs

- [Architecture](../../docs/architecture.md)
- [Orgs and members](../../docs/protocol/orgs-and-members.md)
- [Access and security](../../docs/protocol/access-and-security.md)
- [Migrations](../../migrations/README.md)
