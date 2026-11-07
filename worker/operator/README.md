# Operator actions

The operator is the person who runs the app, as opposed to the admin of an
org inside the app. This folder holds the operator's API in the Worker. It
has one action: suspend a user, for example after an abuse report. A
suspension signs the user out, stops every cloud computer that the user
owns, and blocks each new start.

## Suspend a user

Send `POST /api/operator/users/<githubId>/suspension` to the app hostname.
`userSuspensionPath` in [`src/shared/operator.ts`](../../src/shared/operator.ts)
builds the path. `<githubId>` is the numeric GitHub user ID of the target
user. GitHub keeps that ID when the user renames their login.

Access:

- The normal app gate runs first. It needs the session cookie of a
  signed-in user, a matching `Origin` header, and a JSON object body, as
  the [request gate](../security/README.md) says. The action reads nothing
  from the body, so send `{}`.
- The action then checks that the GitHub ID of the signed-in user is in
  `OPERATOR_GITHUB_IDS`. Otherwise it answers 403 `operator_required`.
  Without that setting, every request gets this answer.
- A GitHub ID without an account gets 404 `user_not_found`.

The action takes these steps, in this order:

1. It records the suspension on the user: the time, and the operator who
   sent the request.
2. In one D1 batch, it deletes every session of the user, also the
   sessions of the Mac app. In the same batch, it revokes the preview
   hostnames of each workspace that the user owns. This happens before
   any stop request.
3. It asks the Durable Object of each workspace that the user owns to
   cancel the active start and stop the sandbox, as
   [The stop of one workspace](#the-stop-of-one-workspace) says.
4. It wakes the image coordinator of each unfinished image build that the
   user started. The coordinator stops the build and marks it failed. It
   retries the cleanup until no build sandbox of that build is left.

The reply is a `UserSuspensionResponse`: `userId`, `suspendedAt`,
`pendingWorkspaceIds`, and `pendingBuildIds`. The status is 200 when
nothing is pending. It is 202 when the stop of a workspace has not
finished, or when the user started an unfinished build. The suspension is
in force in both cases. Each pending workspace retries its stop on its own
alarm, without the operator.

The action is idempotent. A repeat keeps the first time and the first
operator, and runs the other steps again. Repeat it to see what is still
pending. No route lifts a suspension.

To send the request from a terminal, sign in to the app in a browser as an
operator. Copy the value of the `__Host-conductive-session` cookie from the
developer tools of the browser. `gh api users/<login> --jq .id` gives the
GitHub ID of a login. Then run:

```sh
APP=https://app.conductive.build
curl -X POST "$APP/api/operator/users/<githubId>/suspension" \
  -H "Origin: $APP" \
  -H 'Content-Type: application/json' \
  -H 'Cookie: __Host-conductive-session=<cookie value>' \
  --data '{}'
```

## What a suspension blocks

The suspension stays on the user record. Each of these entries reads it:

- Sign-in, the sign-in exchange of the Mac app, each session, open chat
  tabs, and terminal sockets, as
  [Suspended users](../security/README.md#suspended-users) says.
- New workspaces, resumes, queued starts, image builds, and the disk
  retention restart, as [Lifecycle checks](#lifecycle-checks) says. No
  member can start a workspace that the user owns. The other members can
  still open it and read its history.
- Interactive access to the sandbox of each workspace that the user owns,
  also for the other members, as [Sandbox access](#sandbox-access) says.
- The workspace token of each workspace that the user owns. The runner,
  the agent tools, the git credential route, and the Mac command route
  refuse it.
- The user as the sender of a turn. The chat backend gives the runner no
  agent login of that user. The agent tools and the Mac commands refuse
  that sender.

A stopped workspace of the user gets no disk retention restart. So Boat
can delete its disk after 14 days, as
[Stop and resume](../../docs/protocol/workspaces-and-sandboxes.md#stop-and-resume)
says.

## Sandbox access

`sandboxAccessPredicate` in [`sandbox-access.ts`](../data/sandbox-access.ts)
is the one rule of interactive access to a sandbox. The workspace is not
archived, has a sandbox, and runs. Its org is not deleted, and its owner is
not suspended. Each check reads the current owner again, so the rule holds
for as long as the owner stays suspended, also while a stop is pending.

- For a workspace whose owner is suspended, a new preview, a preview
  launch, a terminal socket, and a desktop address answer 403
  `user_suspended` before any call to Boat.
  `requireRunning` and `verifyTarget` in
  [`access.ts`](../previews/access.ts) make this check for the previews,
  the terminal, and the desktop.
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
- An open or a resume that would start the sandbox also needs an owner
  who is not suspended. So no member can start a workspace of a suspended
  owner. A member who is not suspended can still open that workspace and
  read its history, also when it is archived.
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

`suspendLifecycle(workspaceId, ownerUserId)` of the workspace object stops
one workspace of a suspended owner. The third step of the action calls it
for each workspace that the user owns.

1. It cancels the active start, and it revokes the preview hostnames of
   the workspace.
2. While a start still runs, it sets an alarm one second later and
   reports that the stop is pending.
3. Otherwise it stops the sandbox with the app's Boat key, also when the
   org is deleted. A confirmed stop clears the turn records and sets the
   `stopped` state. A sandbox that Boat no longer has counts as stopped. A
   Boat `error` state sets the error state with `user_suspended`.
4. A stop that Boat has not confirmed, or a failed stop, sets an alarm 30
   seconds later and reports that the stop is pending.

While the owner stays suspended, each alarm of the workspace object runs
this stop again. So the stop continues without the operator.
`suspendLifecycle` returns `true` when the stop is complete. It also
returns `true` when the workspace has no suspended owner, or when another
user owns it now.

## Settings

| Name | Value |
| --- | --- |
| `OPERATOR_GITHUB_IDS` | Optional. The numeric GitHub user IDs of the operators, separated by commas, such as `1234,5678`. The action ignores spaces around each ID. It is not a secret. |

Put it in `.dev.vars` for local development. A deployment sets it as a
Worker variable.

## Development

Run `npm run test -- worker/operator` from the repository root, with Node
24. The tests use local D1 and the fake GitHub and Boat servers.

The tests of sandbox access and of the automatic refreshes live beside
their code. After a change to them, run:

```sh
npm run test -- worker/previews worker/terminal/access.test.ts worker/chat/tab-access.test.ts worker/lifecycle/image-refresh.test.ts
```

### Key Code

- [`route.ts`](route.ts): `handleOperatorRequest`, the route and the
  operator check. `route` in [`worker/routes.ts`](../routes.ts) calls it
  first, after the gate.
- [`suspend-user.ts`](suspend-user.ts): `suspendUser`, the steps and the
  pending lists.
- [`data.ts`](data.ts): `recordUserSuspension`, which records the
  suspension and revokes the sessions and previews, and the reads of the
  owned workspaces and builds.
- [`user-access.ts`](../data/user-access.ts): `requireActiveUser`,
  `suspendedUserError`, and the reads that the other areas use.
- [`sandbox-access.ts`](../data/sandbox-access.ts):
  `sandboxAccessPredicate` and `activeWorkspaceOwnerPredicate`, the shared
  SQL rules of sandbox access. Each caller names the workspace row `w`.
- [`settings-data.ts`](../lifecycle/settings-data.ts):
  `firstActiveOrgAdmin`, the admin of the automatic refreshes.
- [`workspace-suspension.ts`](../lifecycle/workspace-suspension.ts):
  `suspendWorkspaceLifecycle`, the stop of one workspace and its retries.
- [`start-access.ts`](../lifecycle/start-access.ts):
  `requireActiveStartUsers`, the user check of a queued start.
- [`202611072200_user_terms_and_suspension.sql`](../../migrations/202611072200_user_terms_and_suspension.sql):
  the columns of the suspension and of the terms consent.

### Related Docs

- [Access and security](../../docs/protocol/access-and-security.md#sign-in)
- [Worker backend](../README.md)
- [Sign-in and request gate](../security/README.md)
- [Workspace lifecycle](../lifecycle/README.md)
