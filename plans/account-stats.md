# Account Stats tab

Status: Active. On branch `calummoore/seoul-1i6o`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Account page has no place where a person sees their own activity. This
change adds a Stats tab to the Account page, at `/account/stats`. The tab
reads live counts of the signed-in person from D1 each time it opens: the
orgs, the workspaces that the person owns with their states, the new
workspaces of each UTC day of the last 30 days, the routines that the
person owns, and the runs of those routines of each UTC day. It reuses the
tiles, the state list, and the daily chart of the operator Overview. The
change records no new data. It does not count agent sessions or turns,
because they live only in the Durable Object of each workspace.

## Decisions

- **Item 1, 16 November 2026: where the Stats page goes.** The user chose
  A: a Stats tab in the Account, for the signed-in person's own activity.
  Rejected: B, a Stats tab on the operator's page of a user, which only
  operators see. C, A with agent usage such as turns and tokens, which
  needs new recording. Left out: a separate Stats tab in the operator
  section, because the operator Overview already is that page.
- **Item 2, 16 November 2026: which numbers the page shows.** The user
  chose A: only the counts that D1 has now. Rejected: B, a new D1 table
  that records each session and turn from the deploy day on. C, B with a
  one-time copy of the past counts from each workspace's Durable Object.
  Left out: a count from each Durable Object at read time, because each
  page open then wakes every workspace of the person.

## Design calls

My calls, 16 November 2026:

- The tab is called Stats. It goes after Keyboard shortcuts and before
  This Mac. Reason: the settings tabs stay together, and This Mac stays
  last, so the tabs of a browser keep their places.
- The counts cover every org of the person, without deleted orgs. Reason:
  the person can no longer open a deleted org.
- A workspace counts for the person who owns it now, as the operator's
  page of a user counts it. Reason: D1 has no creator column, and an admin
  can reassign a workspace.
- A routine counts for its routine owner now. A routine run counts for
  the owner in its own row, the owner whose logins the run used. Reason: a
  later change of the routine owner then does not move past runs. This
  call replaced "its runs count with the routine owner now" during
  Milestone 3, after the read of `routine_runs.owner_user_id`.
- The routine runs leave out skipped runs, because a skipped run started
  no agent.
- The days are UTC days, and the 7 days are the 7 times 24 hours before
  the read, as on the operator Overview.
- The tab has no Refresh. Each open of the tab reads the numbers again.
  Reason: the numbers of one person change slowly.
- When a read fails, the tab shows a notice with Try again and no number,
  because a count that did not load is not zero.
- The command palette gets no Stats row in this change. Reason: the
  palette rows hold settings, and Stats holds no setting.
- The app reader of the operator, `OperatorRead`, becomes a generic page
  reader with a failure hook, so that the Stats tab reuses it.
- The state list of the operator takes its builds as one optional value,
  so that the Stats tab shows no build line.
- No public guide and no legal page changes. A full read of each found no
  sentence that the tab makes wrong.
- The chart axis of a 30-day chart with only zeros shows 0.2 to 1. The
  operator Overview has the same axis, and the Firna chart has no axis
  setting, so this change leaves it.

Contract owners:

- [Account stats](../docs/protocol/account-stats.md), a new protocol doc.
- [Create a workspace](../docs/protocol/create-a-workspace.md#the-preference),
  for the list of the tabs of the Account page.
- The [mockup catalogue](../docs/mockups/catalogue.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Stats tab of the Account page, on desktop and on a phone, with its
numbers, its first load, a failed read, and a new account with no
activity. The tab row of the account in a browser and in the Mac app.

- [x] Add the `stats` tab to the account state and to `AccountTabs`.
- [x] Add a Stats tab component, with fixtures, that the app can import.
- [x] Add the catalogue entries `app/account/stats`,
      `app/account/stats/loading`, `app/account/stats/failed`, and
      `app/account/stats/empty`.
- [x] Update `docs/mockups/catalogue.md` and the description of
      `app/account`.
- [x] Run `npm run mockups:check`. Look at the built pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Add `docs/protocol/account-stats.md` with the requirements and the
      decisions above, and link it from `docs/protocol/README.md`.
- [x] Update the tab lists of the Account page in
      `docs/protocol/create-a-workspace.md`,
      `docs/protocol/desktop-commands.md`, and
      `docs/protocol/command-palette-actions.md`.
- [x] Read the Terms page, the Privacy page, and each public guide in
      full. Update each sentence that restates the tabs of the Account
      page or what the app shows to a person.

## Milestone 3: Worker route

Depends on: 2

- [x] Add the `AccountStats` type, its reader, and the path
      `/api/account/stats` to `src/shared/account.ts`.
- [x] Add `worker/app-api/account-stats.ts`. It reads every count in one
      D1 batch. Share the workspace state SQL with the operator Overview.
- [x] Answer `GET /api/account/stats` in `worker/app-api/boot.ts`.
- [x] Add Worker tests: the counts of the person only, no deleted org,
      no other person's records, the 30 UTC days, and no skipped run.
- [x] Update the README of the Worker app API.

## Milestone 4: App tab

Tags: ui

Depends on: 1, 3

- [x] Add `stats` to `ACCOUNT_TABS` and to the tabs of `AccountScreen`.
- [x] Make `OperatorRead` a generic page reader with a failure hook.
- [x] Add the Stats tab: loading, failed with Try again, and the numbers.
- [x] Add the route to the dev server of the app.
- [x] Add app tests: the tab and its address, the numbers, and a failed
      read with Try again.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Check the tab in a browser on desktop and on a phone.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.
