# Access during a suspension

The [operator API](README.md) serves suspension actions.
These notes describe the access and lifecycle checks of those actions.

## What a suspension blocks

The suspension stays on the user record. Each of these entries reads it:

- Sign-in, the sign-in exchange of the Mac app, each sign-in session,
  open chat tabs, and terminal sockets, as
  [Suspended users](../security/README.md#suspended-users) says. The
  preview grants, cookies, and streams of the user stop too, because each
  one belongs to its viewer, as the [preview backend](../previews/README.md)
  says.
- New workspaces, resumes, queued starts, image builds, and the disk
  retention restart, as [Lifecycle checks](#lifecycle-checks) says. No
  member can start a workspace that the user owns. The other members can
  still open it and read its history.
- Interactive access to the sandbox of each workspace that the user owns,
  also for the other members, as [Sandbox access](#sandbox-access) says.
- The admin role of the user in owner choices and last-admin checks. The
  [members backend](../members/README.md) counts only admins who are not
  suspended, as
  [Owners and admins](../../docs/protocol/operator-actions.md#owners-and-admins)
  says.
- The workspace token of each workspace that the user owns. The
  suspension revokes it, and the shared token rule of
  [`workspace-token-access.ts`](../data/workspace-token-access.ts) also
  refuses a token whose workspace owner is suspended. An open runner
  connection checks that rule before each message and every 15 seconds
  while it is idle, so it closes, as the
  [chat backend](../chat/README.md#access) says. The agent tools, the git
  credential route, and the Mac command route refuse the token too.
- The user as the starter of a session or the sender of a turn. In one
  read, `resolveLogin` refuses the login of a suspended starter and the
  message of a suspended sender, as the
  [chat backend](../chat/README.md#access) says. The agent tools and the
  Mac commands refuse that sender.

A stopped workspace of the user gets no disk retention restart. So Boat
can delete its disk after 14 days, as
[Stop and resume](../../docs/protocol/workspace-life.md#stop-and-resume)
says.

## Sandbox access

`sandboxAccessPredicate` in [`sandbox-access.ts`](../data/sandbox-access.ts)
is the one rule of interactive access to a sandbox. The workspace is not
archived, has a sandbox, and runs. Its org is not deleted, and its owner is
not suspended. Its org is not suspended. Each check reads the current owner again, so the rule holds
for as long as the owner stays suspended, also while a stop is pending.

- For a workspace whose owner is suspended, a new preview, a preview
  launch, a terminal socket, and a desktop address answer 403
  `user_suspended` before any call to Boat.
  `requireRunning` and `verifyTarget` in
  [`access.ts`](../previews/access.ts) make this check for the previews,
  the terminal, and the desktop. Their reply comes from
  `suspendedWorkspaceOwnerError` in [`user-access.ts`](../data/user-access.ts):
  the workspace owner is suspended, and an admin can assign another
  member.
- The preview proxy answers each request to a preview of such a
  workspace with the 404 of an unknown preview. It stops the data of an
  open preview at its next check.
- An open terminal socket closes at its next access check, as
  [Open connections](../security/README.md#open-connections) says.
- An open desktop stream does not pass through the Worker. It plays until
  the sandbox stops.
- The preview list, closing a preview, the terminal status, and the chat
  history stay open to the other members.

## Lifecycle checks

The [workspace lifecycle](../lifecycle/README.md) reads the
suspension before each start and each build step, with `requireActiveUser`
from [`user-access.ts`](../data/user-access.ts). A refusal is 403
`user_suspended`.

- `requireOrgMember` refuses a suspended user. So that user cannot
  create, resume, or build.
- A resume of a stopped or failed workspace also needs an owner who is
  not suspended. So no member can start a workspace of a suspended owner.
  A member who is not suspended can still open that workspace, because an
  open reads its detail and history before any Resume, also when it is
  archived. `requireActiveWorkspaceOwner` makes this check, with the same
  owner reply as sandbox access. The checks of the suspended user's own
  requests keep the reply "This account is suspended."
- The start coordinator checks the users of a queued start before each
  phase: the owner and the sender of a create, the owner of a resume, and
  the member who asked for the resume. A refusal cancels the start. A
  cancelled resume stops its sandbox again. A cancelled create fails as
  [Browser routes](../lifecycle/README.md#browser-routes) says.
- `advanceImageBuild` stops each unfinished build that a suspended user
  started, also before its build sandbox exists, and marks it failed. A
  build whose create reply was lost first repeats its create to find that
  sandbox. The build then retries its cleanup until no build sandbox of
  that build is left.
- `keepWorkspaceDisk` makes no disk retention restart for a suspended
  owner. The [deleted-org retention](../members/README.md) skips such a
  workspace too.
- The automatic refreshes, after a push and on the daily timer, pick the
  first admin who is not suspended, with `firstActiveOrgAdmin` in
  [`settings-data.ts`](../lifecycle/settings-data.ts). An org without
  such an admin gets no automatic refresh. A push then claims no
  throttle, a recorded push refresh stays pending, and the image
  coordinator sets no new alarm. The cleanup of existing builds and the
  check of a deleted org keep `firstOrgAdmin`, which counts every admin.

### The stop of one workspace

`WorkspaceAccessStop` in
[`workspace-suspension.ts`](../lifecycle/workspace-suspension.ts) decides
and runs the stop of one workspace, one call at a time. Each check reads
one row with `readWorkspaceAccessStop` from
[`user-access.ts`](../data/user-access.ts): the owner and the suspension
of the owner, the state, the sandbox, the org, and a revoked workspace
token. The workspace must stop in either of these cases:

- Its owner or its org is suspended.
- It runs with a revoked workspace token, and no start waits. A waiting
  start gives it a new token, so that start goes on.

The stop takes these steps:

1. For a suspended owner or org, it cancels the active start. In both cases it
   revokes the preview hostnames of the workspace.
2. While a start still runs, it sets an alarm one second later and
   reports that the stop is pending.
3. Otherwise it stops the sandbox with the app's Boat key, also when the
   org is deleted. A confirmed stop clears the turn records and sets the
   `stopped` state. A sandbox that Boat no longer has counts as stopped. A
   Boat `error` state sets the error state, with the owner reply of
   `user_suspended` for a suspended owner.
4. A stop that Boat has not confirmed, or a failed stop, sets an alarm 30
   seconds later and reports that the stop is pending.
5. After a confirmed stop, it deletes the alarm for a suspended
   owner or org. An owner who is not suspended keeps the disk retention alarm.

Each alarm of the workspace object runs this check. So a stop goes on
without the operator, also after the workspace gets another owner.

- `suspendLifecycle(workspaceId, ownerUserId)` runs the check for the
  third step of the action. It returns `true` only for a confirmed stop.
  A skipped or pending stop returns `false`, so the reply lists the
  workspace as pending.
- `reconcileLifecycleAccess(workspaceId)` runs the check after each owner
  change, in every state. It uses the same queue as the check, so a late
  stop for the former owner finishes before it reads the new owner. When
  nothing must stop, no start waits, and a stopped workspace has an owner
  who is not suspended, it rearms the lifecycle alarm of that workspace.
