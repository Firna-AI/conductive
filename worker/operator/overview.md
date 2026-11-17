# Operator overview

This guide belongs to the [operator backend](README.md).
The [Overview protocol](../../docs/protocol/operator-overview.md) gives its requirements.

## Overview

Send `GET /api/operator/overview` to the app hostname.
`operatorOverviewPath` in [`src/shared/operator.ts`](../../src/shared/operator.ts)
builds the path. The normal app request gate runs first.
The route then checks the signed-in user's numeric GitHub ID with
`isOperator` in [`access.ts`](access.ts).
It answers 403 `operator_required` when the ID is not in `OPERATOR_GITHUB_IDS`.
Without that setting, nobody is an operator.
The account reply uses the same reader for its `operator` boolean.
The reader ignores spaces around each ID in the comma list.

The reply is an `OperatorOverview` from
[`src/shared/operator.ts`](../../src/shared/operator.ts):

- `readAt` gives the read time in Unix milliseconds.
- `users`, `orgs`, and `workspaces` each give `total` and `lastWeek`.
  The week covers the last 7 times 24 hours through `readAt`.
- `waiting` counts accounts without app access and without a suspension.
  The user counts and daily user counts still include every account.
- `running` gives separate counts for `workspaces` and unfinished image `builds`.
  Builds include both builds and refreshes whose job phase is not `done`.
- `workspaceStates` gives `running`, `stopped`, `failed`, and `archived`.
  Running includes starting, ready, working, unread, and input.
  An archived workspace contributes only to Archived.
  Failed counts the error state.
  The four counts add up to the workspace total.
- `newWorkspacesByDay` and `newUsersByDay` each give 30 `{ date, count }` entries.
  Dates use `YYYY-MM-DD` in UTC, from oldest to newest.
  The last entry covers the current UTC day through `readAt`.
  A day without a record has a zero count.
- `largestOrgs` gives up to five orgs with `id`, `name`, `initials`, `members`, `workspaces`, and `running`.
  Initials are null when the org has no custom initials.
  The workspace count includes archived workspaces.
  The order is workspace count first, largest first, then org name.
  This list leaves out deleted orgs.
- `longRuns` gives up to ten running, unarchived workspaces with a known start.
  It orders them by `runningSince`, oldest first, then by `workspaceId`.
  Each entry gives `workspaceId`, `workspaceNumber`, `orgId`, and `orgName`.
  Its `orgStatus` is `active`, `suspended`, or `deleted`. Deleted takes priority.
  Its `ownerGithubId`, `ownerLogin`, and `ownerStatus` identify the owner.
  Owner status is `active` or `suspended`.
  `cloudComputerId` is the sandbox ID, or null until it is assigned.
  `state` uses the shared workspace state type.
  `runningSince` is the current run's start in Unix milliseconds.
  `lastActivityAt` is the last activity in Unix milliseconds, or null without a saved time.
  These entries have no workspace name or org initials.
  The list includes deleted and suspended orgs and suspended owners.

[`overview.ts`](overview.ts) reads the counts and long runs from D1 in one batch.
The counts include all records that still exist, also those of deleted orgs.
Only `largestOrgs` leaves deleted orgs out.
The route keeps no history and calls no sandbox provider.
The [Long runs protocol](../../docs/protocol/operator-overview.md#long-runs)
gives the list rules and the limits of the saved workspace state.
