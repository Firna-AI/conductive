# Members backend

This area implements org roles, invitations, workspace responsibility, and
Delete org. It uses the fixed browser contracts in
[shared types](../../src/shared/README.md).
The main Worker dispatches these handlers after `membersGate`.
Its production hooks use the real workspace and image coordinator objects.

## Integration

Run `membersGate` before feature dispatch on the app hostname.
It calls the existing gate for sign-in, hostname, Origin, and JSON checks.
It then reads current membership from D1.
It permits a deleted org only for its admins on its detail, Delete retry,
and Restore paths.
It also checks admin permission on shared-settings writes.
Use `membersRoute` before the current core dispatcher.
An unmatched route returns `null` for the next handler.
Keep the existing private response headers and error handler around dispatch.

The routes use paths from `src/shared/members.ts` and `orgs.ts`.
`membersRoute` alone serves the org list and one org.
Org creation stays with `featureShellRoute` of the [app API](../app-api/README.md).
The routes also serve member lists, invitation creation and cancellation, role changes,
removal, leave, workspace reassignment, org rename, Delete, and Restore.
Shared-settings persistence remains with the settings backend.
That backend must call `assertCanChangeSharedSettings` before writes.
It must also include `activeAdminPredicate` in its D1 mutation.
Bind the org ID and actor ID for that predicate.
This keeps a concurrent role change or deletion from permitting a stale write.
`activeAdminPredicate` counts only an admin whose account is not suspended.

Deleted-org work gets its provider from `deletedOrgProvider` in `cleanup-provider.ts`.
It first checks the cleanup lease of the org.
It then calls `sandboxProvider` from the [sandbox area](../sandbox/README.md), which uses the app's one Boat key.
Under a cleanup lease, a provider failure returns 502 `org_cleanup_failed`.
A refused Boat key is such a failure. The recovery state stays for a retry.

A suspended org stays visible to its members.
Every member write except voluntary Leave uses the shared active-org check and SQL predicate.
The Leave recipient and last-active-admin rules remain in force.
Pending invitation lists omit suspended orgs, and acceptance preserves their invitations and memberships.
Org suspension also blocks a pending Restore activation and disk retention restart.

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
Production lifecycle phases capture their receiver generation before provider work.
Restore installs a newer suspended fence and drains those phases before it arms active timers.

Restore must install its generation in every org, build, and workspace receiver before its callback returns.
Its input includes every workspace ID, including archived and sandbox-free workspaces.
Install the generation even when no timer or payload needs changing.
Only then can Members activate the org with a guarded SQL write for that same generation.
A late older suspension must therefore fail at its receiver write.
Payload deletion must preserve its rejection of stale calls while older calls can still arrive.
Purge reads and deletes small batches. Each batch checks the same generation and preserves the fence.
The normal storage adapter rejects chat, device, feature, and alarm writes after that fence is purged.
Late summary reads cannot recreate chat metadata. Suspended stop callbacks can still write their final events.
The production receiver keeps a stopped create checkpoint after Delete, before or after allocation.
Restore starts no sandbox. The normal resume route requeues that create when the workspace opens.
The checkpoint keeps its sender, first message, and allocation identity.
The requeued create gets a fresh 20-minute start limit from that open. It keeps its original creation date.
A create without a sandbox also keeps its image pin. A missing pin keeps the workspace, its accepted chat, and its error, with durable sandbox cleanup.
A create with a retained sandbox resumes it and continues at its saved creation step, as the [lifecycle README](../lifecycle/README.md#browser-routes) says.
Hidden attempts and pending lifecycle cleanup sandboxes also enter suspension and purge.

A hook calls `ownership.renew()` as it makes progress.
Renewal requires the current generation, current lease token, and an unexpired lease.
There is no timer, interval, or background heartbeat for a hung hook.
The capability closes when its callback returns or loses ownership.
Retention capabilities use that same call ownership.
Their D1 writes and lifecycle checkpoints also check the generation atomically.
Cooperative renewal changes no Restore deadline.

Supply the required `MembersHooks` callbacks.
Production also supplies `deleteOrgState` to remove the image coordinator payload, including an org with no workspaces:

- `readWorkspace` returns the lifecycle backend's current `Workspace` record.
  It must authorize the viewer. All current org members can read all workspaces.
- `workspaceOwnerChanged` runs after each workspace that gets a new owner, by a reassignment or by a member who leaves or is removed.
  `workspaceOwnerChangedHook` in [`ownership-maintenance.ts`](../lifecycle/ownership-maintenance.ts) supplies it.
  It calls `reconcileLifecycleAccess` of the workspace object, which checks the workspace at once, in every state.
  The check stops a workspace that must still stop, such as a running workspace with a revoked token, and rearms the lifecycle alarm of a stopped workspace whose new owner is not suspended.
  [The stop of one workspace](../operator/README.md#the-stop-of-one-workspace) says how.
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
The save of an intent, its read before each handoff, and the activation each check its admin with `activeAdminMemberPredicate`.
So an admin who lost the role or is suspended cannot activate a pending Restore. An expired window cannot either.
When that read finds no valid intent, it cancels the intent, and the org stays deleted.
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
Its computer inventory reads live entries from the computer ledger.
The inventory includes retained computers whose workspace or build record is gone.
A confirmed computer deletion marks its ledger entry in the same batch as the journal step.
The ledger entries remain until the org purge removes them through the org reference.
The result names purged orgs and orgs that need another attempt.
D1 ownership records stay until every external cleanup succeeds.
Attachment cleanup follows the same rule.
Workspace purge removes its R2 files after the workspace receiver fence drains its work.
Org purge also removes draft files and files of failed creation attempts.
An R2 failure keeps the deletion record and leaves the org pending for retry.
The scheduled handler sweeps expired unsent attachments before org work.
Its claimed-file check runs in the workspace chat queue, beside message admission.
An accepted file of a surviving workspace stays until purge.
See [chat attachments](../chat/attachments.md) for the storage boundary and expiry proof.
A cleanup lease separates Restore from cleanup calls.
An expired lease permits a later attempt after a worker stops.

The maintenance capability accepts only workspace IDs from its callback.
It checks the current lease before every operation.
The disk lists of maintenance, retention, and Restore leave out each workspace whose owner the [operator suspended](../operator/README.md).
The capability also refuses to restart such a workspace, so retention starts no cloud computer of a suspended user.
A restart must be due at its stored keepalive date.
It resumes with `noEnv` and empty env vars, then stops the sandbox.
It supplies no workspace token, agent login, or org secret.
Keep runner, preview, user startup, and agent access suspended in retention mode.
Before the resume, Members journals a pending stop for crash recovery.
Only an acknowledged resume followed by a stop creates a new real stop date.
A failed or uncertain resume keeps the older conservative date.
The capability expires when its callback ends or its lease expires.

An invitation names an email.
The invite route sends it through `createInvitationMailer` in `worker/invitation-mailer.ts`.
`AppDependencies.invitationMailer` replaces that mailer when it is set.
The mailer posts to Resend with the `RESEND_API_KEY` Worker secret, from `invites@mail.conductive.build`.
[Secrets](../../docs/deployment.md#secrets) says which domain Resend must verify for this sender.
With a local `APP_ORIGIN`, such as `http://127.0.0.1:5173`, the mailer always writes each invitation link to the log and sends no email.
This is also true when the key is set.
On every other origin, the mailer needs the key and fails each send without it.
A failed send returns `invite_email_failed` and keeps the invitation, so the admin can invite the same email again.
The link opens the app origin with the invite ID in its `invite` query parameter.

Each sign-in calls `saveVerifiedEmails`.
It replaces the user's stored emails with the verified emails from GitHub's `GET /user/emails`.
A failed read fails the sign-in.
Emails match without case. An unverified email matches no invitation.
The private `org_invite_users` table keeps a durable match of each invitation to each user whose verified email it named.
An insert trigger on `org_invites` records a match for each user with a stored verified email that the new invitation names.
An insert trigger on `user_verified_emails` records a match for each invitation that names an email that a sign-in stores.
A later sign-in without that email keeps the match.
Only the deletion of its invitation or its user removes a match.
The shared browser contracts expose `GET /api/invites` for the pending list.
`POST /api/invites/:inviteId/accept` explicitly accepts an invitation.
The [invitation route](../app-api/invitations.ts) uses the signed-in user and the existing verified-email checks.
Call `pendingOrgInvites` with the signed-in user's ID to list their pending invitations.
The list holds the invitations of active orgs that name one of the user's current verified emails.
It leaves out the invitations of orgs where the user is already a member.
Call `acceptOrgInvite` after an explicit acceptance by a signed-in user.
It accepts only an invitation that names one of that user's current verified emails.
A durable match alone does not permit acceptance.
Sign-in alone does not accept an invitation.
A membership-delete trigger cancels each invitation of the membership's org that has a durable match to the departing user.
It runs in the same statement as the membership delete, so the removal and the cancellation apply together.

Call `workspaceCreator` when the lifecycle creates a workspace.
Store its ID in `owner_user_id` in the creation transaction.
Reassignment changes the owner and update time only.
Each session keeps the agent login of its starter.

`activeAdminMemberPredicate(alias)` in [`active-admin.ts`](../data/active-admin.ts) is the one SQL rule of an active admin: the admin role, and a user whose account is not suspended.
It accepts only the trusted aliases `m`, `access_member`, `org_members`, `remaining`, and `candidate`.
`activeAdminPredicate`, the last-admin guards, the recipient of a leave, `firstActiveOrgAdmin`, and the Restore intent queries in `restore-data.ts` use it.

- A leave, a removal, or a role change can end the admin role of an active admin only while another active admin remains.
  Otherwise it fails with 409 `last_admin`, which asks to make another member whose account is not suspended an admin.
- A leave gives the workspaces to the earliest active admin, else to the earliest member who is not suspended, else to the earliest admin.
  A removal gives them to the admin who removes the member.
- A reassignment checks its recipient in the same write. A suspended recipient gets 409 `owner_suspended`, and nothing changes.
- `firstOrgAdmin` and the account-deletion guard of `account.ts` do not use the rule. So that guard still counts every admin.

[Owners and admins](../../docs/protocol/operator-actions.md#owners-and-admins) states the requirements.

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

- [composition.ts](composition.ts) supplies the production lifecycle hooks.
- [workspace-receiver.ts](workspace-receiver.ts) preserves the receiver fence while it removes workspace payloads.
- [receiver-fence.ts](receiver-fence.ts) checks generations in storage transactions.
- [receiver-storage.ts](receiver-storage.ts) prevents normal data and alarm writes after purge.
- [creation-checkpoint.ts](creation-checkpoint.ts) requeues a retained create only after current access and token checks. A create without a sandbox also needs its image pin.
- `gate.ts` extends the request gate for deleted-org access and shared writes.
- `route.ts` defines HTTP dispatch and the required integration hooks.
- `membership.ts` manages roles, removal, leave, and the last-admin rule.
- `errors.ts` defines `lastActiveAdminError` and `suspendedOwnerRecipientError`.
- [`active-admin.ts`](../data/active-admin.ts) defines `activeAdminMemberPredicate`, the shared SQL rule of an active admin.
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
- `cleanup-lease.ts` scopes cleanup work and maps its failures to `org_cleanup_failed`.
- `cleanup-provider.ts` checks the cleanup lease before it gives deleted-org work a provider.
- `cleanup.ts` implements scheduled provider and data cleanup.
- `account.ts` exposes the last-admin account-deletion guard.
- `*-data.ts` owns the D1 queries and the guarded mutation predicates.

### Related Docs

- [Architecture](../../docs/architecture.md)
- [Orgs and members](../../docs/protocol/orgs-and-members.md)
- [Access and security](../../docs/protocol/access-and-security.md)
- [Migrations](../../migrations/README.md)
