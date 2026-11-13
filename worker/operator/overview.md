# Operator overview

This guide belongs to the [operator backend](README.md).

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
- `workspaceStates` gives `running`, `stopped`, `failed`, `archived`, and `removed`.
  Running includes starting, ready, working, unread, and input.
  Archived counts archived workspaces before their removal.
  Removed counts archived workspaces from the end of their 14 days of Restore.
  This count does not depend on a kept cloud computer or its deletion.
  Failed counts the error state.
  The five counts add up to the workspace total.
- `newWorkspacesByDay` and `newUsersByDay` each give 30 `{ date, count }` entries.
  Dates use `YYYY-MM-DD` in UTC, from oldest to newest.
  The last entry covers the current UTC day through `readAt`.
  A day without a record has a zero count.
- `largestOrgs` gives up to five orgs with `id`, `name`, `initials`, `members`, `workspaces`, and `running`.
  Initials are null when the org has no custom initials.
  The workspace count includes every workspace, also archived and removed workspaces.
  The order is workspace count first, largest first, then org name.
  This list leaves out deleted orgs.

[`overview.ts`](overview.ts) reads every count from D1 in one batch.
The counts include all records that still exist, also those of deleted orgs.
Only `largestOrgs` leaves deleted orgs out.
The route keeps no history and calls no sandbox provider.
