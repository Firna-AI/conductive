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
Restore, and existing key GET/PUT paths.
It also checks admin permission on shared-settings writes.
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

The key store uses `assertCanMaintainOrgKey` and
`orgKeyMaintenancePredicate` from `key-maintenance.ts`.
Its insert-select checks the current admin in the same statement as the account guard.
That one authorization condition covers the first save and every upsert.
The core route passes the actual sender's user ID to the store.
After a refused atomic save, the store checks permission again before reporting an account mismatch.
This permission includes current admins of deleted orgs.
Other deleted-org settings stay blocked.
An active org's members can still read key status for the composer.
The existing key store keeps encryption and same-account protection.
A provider authentication refusal under a cleanup lease returns
`boat_key_required` and asks the current admin to replace the cloud computer key.
Both authorized provider paths use `storedOrgSandboxProvider` in `worker/sandbox/keys.ts`.
Each caller first authorizes its org and resource.
The loader returns `SandboxProvider` and keeps the encryption context and plaintext key private.
Each caller supplies its own missing-key text.

## Lifecycle ownership

`runLifecycleHook` runs every lifecycle mutation callback.
It covers `suspendOrg`, `maintainDeletedOrg`, `restoreOrgMaintenance`, and `deleteWorkspaceState`.
`readWorkspace` remains a normal read.
Each call gets a new generation from `orgs.lifecycle_generation` under a valid cleanup lease.
The increment and lease condition share one atomic SQL statement.
The counter survives Restore and later Delete cycles.
Lease tokens and generations stay internal.

Each hook receives `LifecycleOwnership` with its org ID, generation, and `renew` capability.
Send the org and generation to lifecycle receivers. Keep the renewal capability in the server adapter.
The receiver must install the incoming generation atomically before it starts slow work.
It must reject an older generation at every actual lifecycle write.
Read the latest receiver fence and apply each change in one storage transaction.
`applyLifecycleMutation` supplies the synchronous fence check and mutation step inside that transaction.
Persist the fence and the changed payload together.
After an await, read the fence again inside the next write transaction.
A prior lease check or a cached fence cannot authorize a later write.
The helper rejects a generation from another org.
Concurrent calls must be safe, including a late call whose lease has expired.

Restore must install its generation in every org, build, and workspace receiver before its callback returns.
Its input includes every workspace ID, including archived and sandbox-free workspaces.
Install the generation even when no timer or payload needs changing.
Only then can Members activate the org with a guarded SQL write for that same generation.
A late older suspension must therefore fail at its receiver write.
Payload deletion must preserve its rejection of stale calls while older calls can still arrive.

A hook calls `ownership.renew()` as it makes progress.
Renewal requires the current generation, current lease token, and an unexpired lease.
There is no timer, interval, or background heartbeat for a hung hook.
The capability closes when its callback returns or loses ownership.
Retention capabilities use that same call ownership.
Their D1 writes and lifecycle checkpoints also check the generation atomically.
Cooperative renewal changes no Restore deadline.

Supply all five `MembersHooks` callbacks:

- `readWorkspace` returns the lifecycle backend's current `Workspace` record.
  It must authorize the viewer. All current org members can read all workspaces.
- `suspendOrg` stops org access before resource enumeration.
  It must reject new starts and writes for the deleted org.
  It must drain pending workspace starts and image builds.
  It must retain their sandbox IDs and snapshot names in D1.
  It must close existing browser and runner access.
  It must disable normal idle, refresh, and disk keepalive timers.
  It must handle builds even when the workspace list is empty.
  It must finish before it returns. Concurrent and repeated writes must honor their generation.
  Members then owns the deleted-org maintenance schedule through the next hook.
- `maintainDeletedOrg` gets the real deletion dates and each retained workspace
  disk's real stop date and next keepalive date.
  Its input carries the call ownership and renewal capability.
  It plans the normal decision-43 deadline through `retention.schedule`.
  It keeps an existing deadline unchanged.
  A newly stopped disk must receive a deadline.
  In `retention` mode, it performs only due restarts through `retention.restart`.
  It then schedules the new stop's next keepalive.
  In `restore` mode, it only plans dates. It must start no sandbox.
  Build sandboxes and archived workspaces do not enter this hook.
  The lifecycle keeps its restart policy here, including its margin before day 14.
  It must await every capability call before it returns.
  A hook failure keeps the org pending for retry.
- `restoreOrgMaintenance` receives the Restore request ID, requesting admin,
  original deletion deadline, and current disk schedules.
  It also receives the call ownership and the complete workspace ID list.
  It returns disk and org-refresh timers to the active lifecycle.
  It must arm these timers before it returns.
  The timers must check active org state and current disk/settings records before running.
  It must keep normal access closed and start no sandbox during the handoff.
  Replace older timer plans for the same org.
  Concurrent calls must reject older generations, even when request IDs match.
  An unopened workspace must get maintenance after activation.
- `deleteWorkspaceState` removes all workspace Durable Object state and any
  other external workspace data under its call generation.
  Its receiver must reject stale concurrent removals and writes.

Delete records the deletion date and revokes previews before any hook or provider call.
It preserves an already-stopped disk's stop and keepalive dates.
A failed suspension, stop, or maintenance call keeps recovery state for retry.
Restore saves a durable intent bound to its current admin and original deadline.
It finishes stops, plans disk dates, and completes the maintenance handoff.
Retries by the same admin keep the same intent ID.
Only then does it clear the deletion marker and recovery journal.
A failed handoff leaves ordinary access closed.
Scheduled cleanup retries that handoff while the request remains valid.
A newer Delete retry cancels the intent.
An invalid admin or an expired window cannot activate a pending Restore.
Restore makes no provider resume call. Old preview hostnames stay revoked.

Schedule `cleanupDeletedOrgs` with all hooks except `readWorkspace`.
It retries stops and controlled retention during the restore window.
Retention continues before each pending Restore handoff attempt.
Choose a cleanup interval plus retry budget smaller than the lifecycle's
margin between its keepalive date and the disk's 14-day expiry.
For a one-hour margin, both together must take less than one hour.
The test policy uses that margin. Production uses the lifecycle's own policy.
After seven days, it removes all recorded org-image and build snapshots
before any sandbox deletion. It then removes workspace state and D1 rows.
The resource journal keeps completed steps after a failure.
The result names purged orgs and orgs that need another attempt.
D1 ownership and encrypted keys stay until every external cleanup succeeds.
A cleanup lease separates Restore from cleanup calls.
An expired lease permits a later attempt after a worker stops.

The maintenance capability accepts only workspace IDs from its callback.
It checks the current lease before every operation.
A restart must be due at its stored keepalive date.
It resumes with `noEnv` and empty env vars, then stops the sandbox.
It supplies no workspace token, agent login, or org secret.
Keep runner, preview, user startup, and agent access suspended in retention mode.
Before the resume, Members journals a pending stop for crash recovery.
Only an acknowledged resume followed by a stop creates a new real stop date.
A failed or uncertain resume keeps the older conservative date.
The capability expires when its callback ends or its lease expires.

Invitation acceptance has no browser route in the fixed contracts.
Call `acceptOrgInvite` after an explicit acceptance by a signed-in user.
It verifies the invite ID against that user's current stored GitHub login.
Sign-in alone does not accept an invitation.
A membership-delete trigger invalidates that user's pending invites for the org, with a case-insensitive GitHub login match.

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
The harness uses Wrangler's migration SQL splitter to keep trigger bodies intact.

### Key Code

- `gate.ts` extends the request gate for deleted-org access and shared writes.
- `route.ts` defines HTTP dispatch and the required integration hooks.
- `membership.ts` manages roles, removal, leave, and the last-admin rule.
- `invites.ts` manages pending invitations and explicit acceptance.
- `ownership.ts` supplies creation ownership and workspace reassignment.
- `deletion.ts` implements Delete, suspension, and provider stops.
- `maintenance.ts` runs lifecycle maintenance and validates schedules.
- `retention.ts` supplies the scoped retention capabilities.
- `maintenance-contract.ts` defines the required lifecycle maintenance callbacks.
- `lifecycle-runner.ts` runs all lifecycle callbacks with a generation and cooperative renewal.
- `lifecycle-contract.ts` defines ownership and the receiver's atomic mutation helper.
- `lifecycle-data.ts` allocates generations and guards lifecycle writes and renewal.
- `restore.ts` implements the retryable Restore handoff.
- `cleanup-lease.ts` scopes cleanup work and maps refused-key errors.
- `key-maintenance.ts` supplies deleted-org key repair permission.
- `cleanup.ts` implements scheduled provider and data cleanup.
- `account.ts` exposes the last-admin account-deletion guard.
- `*-data.ts` owns the D1 queries and the guarded mutation predicates.

### Related Docs

- [Architecture](../../docs/architecture.md)
- [Orgs and members](../../docs/protocol/orgs-and-members.md)
- [Access and security](../../docs/protocol/access-and-security.md)
- [Migrations](../../migrations/README.md)
