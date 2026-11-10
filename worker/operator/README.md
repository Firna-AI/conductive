# Operator actions

The operator is the person who runs the app, as opposed to the admin of an
org inside the app. This folder holds the operator's API in the Worker.
It reads app-wide numbers.
It can suspend a user or an org after an abuse report. A user
suspension signs the user out, stops every cloud computer that the user
owns, and blocks each new start.
It also lists and approves people who wait, manages invite codes, and
pauses sign-ups. [Waitlist routes](#waitlist-codes-and-sign-ups) describes
these entry points.

## Overview

The [overview guide](overview.md) gives the route, access check, counts, and response.

## Orgs and users

These four reads use the same app gate and operator check as the overview.
Another signed-in user gets 403 `operator_required` on each route.
The path helpers and reply types live in
[`src/shared/operator.ts`](../../src/shared/operator.ts).

| Route | Path helper | Reply |
| --- | --- | --- |
| `GET /api/operator/orgs` | `operatorOrgsPath` | `OperatorOrgsResponse` |
| `GET /api/operator/users` | `operatorUsersPath` | `OperatorUsersResponse` |
| `GET /api/operator/orgs/<orgId>` | `operatorOrgPath` | `OperatorOrgDetail` |
| `GET /api/operator/users/<githubId>` | `operatorUserPath` | `OperatorUserDetail` |

Each list accepts optional `q` and `cursor` query parameters.
It returns at most 20 entries, newest first.
An org creation tie uses the org ID in ascending order.
A user join tie uses the numeric GitHub ID in ascending order.

`total` counts all matches before the cursor.
`nextCursor` is null when no further page exists.
Use the same `q` with the returned cursor to read the next page.
Without `q`, the list includes every record, also suspended users and deleted orgs.

Org search matches part of a name without case sensitivity.
It also matches an exact org ID or a stored computer ID.
Computer IDs include workspaces, builds, cleanup records, preview listeners, and terminal credentials.
The computer ledger supplies those IDs, including deleted computers.
Computer search keeps working after the original resource records are removed.
A preview search accepts a full URL or a bare hostname.
The URL path does not affect the search.
Open and closed previews both count while their records exist.

User search matches part of a GitHub login or name without case sensitivity.
It also matches an exact numeric GitHub ID.
Both searches treat `%`, `_`, and backslash as literal name text.
Each D1 query binds its input values.

Org entries give `id`, `providerAccount`, `name`, `initials`, `createdAt`, `members`, `workspaces`, `running`, `status`, and `match`.
The workspace count includes archived workspaces.
Running counts only workspaces, not builds.
Status is `deleted`, `suspended`, or `active`, in that priority.
Match is `org-id`, `cloud-computer-id`, or `preview-address` for a resource match.
Match is null for a name match or no search.

User entries give `githubId`, `login`, `name`, `joinedAt`, `orgs`, `workspaces`, and `status`.
User status is `active` or `suspended`.
Both user entries and user pages also include `OperatorUserAccess` from
[`operator-waitlist.ts`](../../src/shared/operator-waitlist.ts).
`appAccess` is a waiting record with `waitingSince`, or a granted record
with `grantedAt` and its source. The source identifies the approving
operator, invite label, referral owner, or org and inviting admin.
It also represents operator and existing-account grants.
`githubCreatedAt` gives the GitHub account creation time, or null.
`hasVerifiedEmail` is a boolean. It reveals no address.
`approvalEmail` gives `state` and `updatedAt`. Its states are `none`,
`pending`, `sent`, and `failed`. An absent email record has no time.
`referralCode` is null without a code. Otherwise it gives the code,
counts, disabled state and actor, and recipients with their GitHub IDs,
logins, names, and use times. A recipient without a GitHub name has the
name null. The code count retains uses by deleted accounts.
The recipient list includes only accounts that still exist.

The org page gives its identity, creation time, and selected repository count.
It gives `workspaceStates`, `running`, and members with their identities, names, roles, and suspension flags.
It also gives `suspension` and `deletion`, each null when absent.
The deletion gives `deletedAt` and `purgeAt`.
The purge time is null when no time is stored.

The state buckets match the overview.
Running separates workspaces from unfinished builds and refreshes.

The user page gives their identity, name, join time, and owned workspace counts.
Its `workspaces` gives `total` and `running`.
Its `orgs` gives each org's identity, initials, and the user's role.
It also gives the suspension, or null.

Each suspension gives `suspendedAt` and its operator's `githubId` and `login`.
The operator is null when its account record is absent.

Names and custom initials are null when absent.
All times use Unix milliseconds.

An unknown org gets 404 `org_not_found`.
An unknown or non-numeric GitHub ID gets 404 `user_not_found`.
These reads return no chat, file, env value, agent login, or email address.

## Provider weights

The [provider weights guide](providers.md) gives the GET and PUT routes,
configured accounts, org counts, and atomic change records.

## Waitlist, codes, and sign-ups

The [waitlist guide](waitlist.md) gives the routes, approval rules, codes, and sign-up pause.

### Approval email delivery

[Approval email delivery](waitlist.md#approval-email-delivery) gives delivery and retry details.

## Suspend a user

Send `POST /api/operator/users/<githubId>/suspension` with `{}` through the app gate.
`userSuspensionPath` builds the path.
The operator check runs after the gate.
The reply is `UserSuspensionResponse`, with `userId`, `suspendedAt`, `pendingWorkspaceIds`, and `pendingBuildIds`.
The status is 202 while a stop is pending, and 200 otherwise.
[User suspension](suspension-actions.md#suspend-a-user) gives the steps and a terminal example.

## Suspend an org

Send `POST /api/operator/orgs/<orgId>/suspension` with `{}` through the same gate.
`orgSuspensionPath` builds the encoded path.
The reply is `OrgSuspensionResponse`, with `orgId` and the other fields of a user suspension.
The action covers every owner and starter in the org.
[Org suspension](suspension-actions.md#suspend-an-org) gives the checks and cleanup.

## Lift a suspension

Send `DELETE` to `userSuspensionPath` or `orgSuspensionPath` with `{}`.
These are the same paths that a suspension uses.
The normal app gate requires a session, a matching `Origin`, and a JSON object body.
The same operator check then runs.
Another user gets 403 `operator_required`.
An unknown target gets 404 `user_not_found` or `org_not_found`.

A lift clears the current suspension and records its event in one D1 batch.
It then calls `reconcileLifecycleAccess` for each affected workspace.
For a user, these are the workspaces that the user owns.
For an org, these are all workspaces of that org.
The check sets the disk restart again when no suspension or other rule blocks it.
An overdue restart runs on the due alarm.

The reply is `UserSuspensionLiftResponse` or `OrgSuspensionLiftResponse`.
It gives `userId` or `orgId`, `liftedAt`, and `pendingWorkspaceIds`.
The user ID is the stored account ID, as in a suspension reply.
`liftedAt` is the lift time in Unix milliseconds.
The status is always 200 after the lift succeeds.
A failed workspace call does not fail the lift.

`pendingWorkspaceIds` lists the checks that did not finish.
A repeat changes nothing, writes no event, and runs no workspace check.
Its `liftedAt` is null and its pending list is empty.
A lift brings back no session, workspace token, preview, or build.
A deleted org keeps its deletion and its restore window.
The org and user pages show only the current suspension, never its event history.

## Repair after a lift

The lift keeps its direct workspace calls as the fast path.
The 15-minute Cron Trigger also repairs overdue disk restarts and image refreshes.
Suspension removes a workspace alarm but keeps its restart time in D1.
The repair uses that saved time with a 15-minute grace period.

It checks stopped and failed workspaces that still have a computer.
It uses the shared archive, owner, and org eligibility rules.
It leaves suspended owners and suspended or deleted orgs alone.
It also wakes an org image coordinator when its saved refresh time is overdue.
That org needs an image and an active admin.
The wake uses the existing idle coordinator scheduler.

Each run checks at most 50 workspaces and 50 orgs.
The warning log gives the count when either limit leaves work pending.
An attempt advances the overdue D1 signal to its attempt time.
This defers a failed call until the next Cron run.
The workspace object keeps its real alarm deadline and decides whether to restart.
The repair never repeats a target in the same run.

## Suspension events

`suspension_events` keeps an append-only record of each suspension and lift.
Each row has an ID, target kind, target ID, action, time, and operator account ID.
Target kinds are `user` and `org`.
Actions are `suspend` and `lift`.
Target IDs are the stored user and org IDs.
The suspension, its event, and every access revocation commit in one D1 batch.
For users, this includes deleting sign-in sessions.
For both target kinds, it includes revoking workspace tokens and preview hostnames.
Any failed write rolls the whole batch back.

A repeat suspension keeps the first time and operator and writes no event.
It still runs every access revocation in its batch.
After a lift, a new suspension gets its own time, operator, and event.
The app never removes an event when its target is deleted.
Deleting an operator sets the event's operator reference to null.
The migration copies each current suspension into its first event.

## What a suspension blocks

[Access during a suspension](suspension-access.md#what-a-suspension-blocks)
lists the checks that enforce a user suspension.

## Sandbox access

[Sandbox access](suspension-access.md#sandbox-access) describes the shared sandbox access rule.

## Lifecycle checks

[Lifecycle checks](suspension-access.md#lifecycle-checks) describe start and build checks.

### The stop of one workspace

[The stop sequence](suspension-access.md#the-stop-of-one-workspace)
describes the stop and its retries.

## Settings

| Name | Value |
| --- | --- |
| `OPERATOR_GITHUB_IDS` | Optional. The numeric GitHub user IDs of the operators, separated by commas, such as `1234,5678`. The shared reader ignores spaces around each ID. It is not a secret. |

Put it in `.dev.vars` for local development. A deployment sets it as a
Worker variable.

## Development

The [operator test guide](tests.md) gives the commands and native provider setup.

### Key Code

- [`route.ts`](route.ts): `handleOperatorRequest`, the route and the
  operator check. `route` in [`worker/routes.ts`](../routes.ts) calls it
  first, after the gate.
- [`access.ts`](access.ts): `isOperator`, the shared operator reader for routes and account replies.
- [`overview.ts`](overview.ts): `readOperatorOverview`, the app-wide counts in one D1 batch.
- [`directory-route.ts`](directory-route.ts): the org and user read dispatch.
- [`waitlist-route.ts`](waitlist-route.ts): the waitlist, approval, code, and pause dispatch.
- [`waitlist-directory.ts`](waitlist-directory.ts): waiting account search and cursor pages.
- [`approval-data.ts`](approval-data.ts): the atomic approval batch and email state queries.
- [`approval-email.ts`](approval-email.ts): the approval message, immediate send, and scheduled retries.
- [`code-data.ts`](code-data.ts): code search, creation, disable, and public mapping.
- [`signup-pause.ts`](signup-pause.ts): the pause read and conditional changes.
- [`user-access-data.ts`](user-access-data.ts): user grant sources, email state, and referral recipients.
- [`org-directory.ts`](org-directory.ts) and [`user-directory.ts`](user-directory.ts): list queries and cursors.
- [`org-detail.ts`](org-detail.ts) and [`user-detail.ts`](user-detail.ts): page queries and reply mapping.
- [`workspace-counts.ts`](workspace-counts.ts): the state buckets shared by the overview and org page.
- [`lift.ts`](lift.ts): the lifts and the checks of affected workspaces.
- [`repair.ts`](../lifecycle/repair.ts): bounded Cron repair of overdue disk and image alarms.
- [`events-data.ts`](events-data.ts): the shared atomic writer for suspension state, events, and access revocations.
- [`suspend-org.ts`](suspend-org.ts) and [`org-data.ts`](org-data.ts): the org action, stored suspension, revocations, and pending resources.
- [`org-access.ts`](../data/org-access.ts): the active-org SQL predicate and the org error.
- [`suspend-user.ts`](suspend-user.ts): `suspendUser`, the steps and the
  pending lists.
- [`computer-data.ts`](computer-data.ts): live ledger computers in the user or org scope.
- [`stop-computers.ts`](stop-computers.ts): groups detached computer IDs into their persistent org task.
  Task admission must succeed before the action reports pending work.
  Failed-computer cleanup stays pending until Delete succeeds.
  A legacy computer without a parent uses its provider ID as the opaque pending identifier.
- [`computer-stop-task.ts`](../lifecycle/computer-stop-task.ts): saves and retries detached Stops through one native object per org.
  Confirmed stops and absent or deleted computers leave its pending list.
- [`data.ts`](data.ts): `recordUserSuspension`, which records the
  suspension and revokes the sign-in sessions and previews, and the
  reads of the owned workspaces and builds.
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
- [`202611090030_suspension_events.sql`](../../migrations/202611090030_suspension_events.sql):
  the event table and the current suspension records.

### Related Docs

- [Operator section](../../docs/protocol/operator-section.md): access, overview numbers, and directory pages.
- [Waitlist](../../docs/protocol/waitlist.md) and [codes](../../docs/protocol/waitlist-codes.md): app access and email rules.
- [Operator actions](../../docs/protocol/operator-actions.md): the
  requirements of the operator, the suspension, and abuse reports.
- [Access and security](../../docs/protocol/access-and-security.md#sign-in)
- [Worker backend](../README.md)
- [Sign-in and request gate](../security/README.md)
- [Workspace lifecycle](../lifecycle/README.md)
