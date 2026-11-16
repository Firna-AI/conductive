# Long runs in the operator section

Status: Active. On branch `calummoore/riga-9ags`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The operator section counts the running workspaces, but it does not say
which cloud computers run, or for how long. A computer stops 30 minutes
after the last user activity, but only when no agent turn runs. So a
turn with background work, a preview page that polls its server, or
steady input can keep a computer running for hours or days. The app
pays for each minute. This change adds a "Long runs" list to the
Overview. It lists the workspaces whose cloud computers have run the
longest since their last start.

The user asked for the change on 16 November 2026 ("add long running
workspaces to the operator admin views"). In the brainstorm of the same
day, the user answered long runs decision 1: "I'm interested in how long
a machine has been running for". Option B measures exactly that at the
least cost, so this plan records the answer as B. The brainstorm notes
are in `.context/long-running-workspaces/brainstorm.md`.

This change does not cover a Stop action for the operator, an alert for
long runs, a cap on the run time, a history of runs, or costs. It also
does not cover the computers of org image builds and software image
builds. A build stops after 60 minutes and a start after 20 minutes, so
they cannot run long.

Contract owners:

- [Operator section](../docs/protocol/operator-section.md#the-overview).
- The [operator overview guide](../worker/operator/overview.md).
- The [lifecycle README](../worker/lifecycle/README.md).
- The [migrations README](../migrations/README.md).
- The [operator catalogue](../docs/mockups/catalogue-operator.md), at
  `app/operator` and `app/operator/long-runs`.

## Decisions

### Long runs decision 1: which "long running" measure the operator sees

- **Chosen:** B, on 16 November 2026, by Cal.
- **Root question:** How does an operator find the workspaces whose cloud
  computers have run for a long time?
- **Background:** No D1 column holds the start time of the current run.
  `last_activity_at` moves on each input and at the end of each turn. The
  workspace Durable Object keeps `start.startedAt` of the last create or
  resume (`worker/lifecycle/durable-start.ts`). It saves its state to the
  workspace row at each state change, and every 5 minutes while a turn
  runs.
- **Options:**
  - **A.** List the running workspaces by idle time, from D1 as it is. It
    does not show the run length, and it misses a run that activity keeps
    alive. Effort: Medium.
  - **B.** Add a nullable `workspaces.running_since` column. The existing
    state save writes it from `start.startedAt` and clears it at a stop.
    The Overview lists the longest current runs. Effort: Medium.
  - **C.** Ask each workspace object for its start time when the Overview
    opens. One call for each running workspace, each behind the chat
    queue of that workspace. Effort: Large.
  - **D.** Read the provider's list of running computers and their cost
    this month. It adds a provider route and costs, which decision 144
    left out, and gives no exact run start. Effort: Large.
  - **E.** Keep a history of every run. It changes "keeps no history" of
    decision 144 and needs a retention rule. Effort: Large.
  - **F.** Added by the options check. The scheduled job runs each minute
    and sets `running_since` on each running row without a time. It
    clears the time on each other row. The time can be up to one minute
    late, a workspace that runs at the deploy gets the deploy time, and it
    adds D1 writes each minute. Effort: Medium.
  - **G.** Added by the options check. Add the time to `computer_ledger`,
    set at each provider create and resume and cleared at each stop. It
    also covers builds and disk restarts. About 13 call sites change, and
    a provider auto-stop that the app does not read leaves a false long
    run. Effort: Large.
- **Left out:**
  - The provider dashboard alone: it fails the goal of a view in the
    operator section, and it does not name the org or the owner.
  - An alert alone: it shows no run length. It can follow as its own
    decision.
  - A cap on the run time: it shows nothing, and it changes the stop rule,
    which says that a stop must not cut off real work.
  - A list only on the org or the user page: the operator must then
    already know the org or the user.
- **Reason for B:** it measures each run from a time that the app already
  knows, with one column, no provider call, and no history. The options
  check on 16 November 2026 kept B. Its report is in
  `.context/operator-long-runs/options-check.md`.

## Design

- The column `workspaces.running_since` is a nullable Unix millisecond
  time.
- `persistLifecycleState` in `worker/lifecycle/workspace-data.ts` writes
  `start.startedAt` while the saved state is starting, ready, working,
  unread, or input. It writes null for stopped, error, and archived.
  This is the same set as `runningWorkspacePredicate`.
- Some code writes the row state without the state save. Each of them
  also sets the time, so that no old time stays:
  - The archive, `markWorkspaceArchived` in
    `worker/app-api/archive-data.ts`, clears it.
  - The stops of a deleted org, in `worker/members/deletion-data.ts` and
    `worker/members/composition-data.ts`, clear it.
  - The disk restart of a deleted org, `markDiskResumed` in
    `worker/members/maintenance-data.ts`, sets it to the restart time.
- The read also uses `runningWorkspacePredicate`. So a row outside the
  running set never shows, also when a later writer forgets the time.
- A workspace that runs at the deploy gets its time at its next save:
  within 5 minutes during a turn, and within 30 minutes otherwise. Until
  then it is not in the list. No backfill guesses a time.
- Known limit, from the brainstorm: a list from D1 misses a computer that
  runs while its row says stopped, such as during a disk restart. After
  the provider stops a computer, its row can say running for about 30
  minutes (`plans/follow-ups/runner-liveness-after-provider-stop.md`).
- The overview batch gets one more query. It reads up to 10 running,
  unarchived workspaces with a time, oldest `running_since` first. A tie
  goes in the order of the workspace ID.
- A partial index on `workspaces(running_since)`, with the condition of
  `runningWorkspacePredicate` and `running_since IS NOT NULL`, keeps the
  read small. It holds only the rows that the list can show.
- `OperatorOverview` in `src/shared/operator.ts` gets `longRuns`. Each
  entry gives the workspace ID and number, the org ID and name, the
  owner's GitHub ID, login, and status, the cloud computer ID, the org
  status, the state, `runningSince`, and `lastActivityAt`. The cloud
  computer ID is null until the provider gives the computer. The entry
  has no org initials, because the rows show no initials tile.
- The org status is active, suspended, or deleted. A deleted org that is
  also suspended is deleted, as on the Orgs tab
  (`worker/operator/org-directory.ts`).
- The owner status is active or suspended, as on the Users tab. A person
  who waits owns no workspace.
- My design calls, 16 November 2026:
  - The list is a section of the Overview, below "Workspaces by state".
    Reason: a new tab would change the tab list of decisions 147 and 160.
  - It shows the 10 longest runs, longest first, with no minimum time.
    Reason: a ranked list needs no product number.
  - Each row shows the org, the owner's login, the workspace number, the
    cloud computer ID, the state mark, the run length, and the last
    activity. It shows no workspace name. Reason: an agent can make the
    name from the chat, and the section keeps the least personal data.
  - The org opens its org page, and the owner opens their user page, as in
    the current lists. The computer ID has Copy, for a search on the Orgs
    tab or in the provider's tools. A row without a computer ID shows a
    dash and no Copy.
  - On a phone, a row keeps the org, the run length, and the state mark.
  - The list includes deleted and suspended orgs while a computer still
    runs, with a Deleted or Suspended mark beside the org. Reason: those
    runs need the operator most.
  - The rows have no Stop action. A Stop would be a new operator action,
    which needs its own decision. Suspend exists on the org and user pages.
- The orchestrator's design call, 16 November 2026, from item 1 of the
  mockup report:
  - A run whose owner is suspended shows a Suspended mark in the owner
    cell, in the style of the mark of a suspended org. Reason: the plan
    keeps suspended orgs marked because those runs need the operator
    most, and the same reason holds for a suspended owner.
- My design calls from the mockups, 16 November 2026:
  - An empty list says which workspaces show in it: "The workspaces with
    the longest runs show here." It does not say that no cloud computer
    runs now. Reason: Running now also counts the builds, which the list
    leaves out. A run without a time, such as after the deploy, does not
    show either. So that sentence can be false while the tile counts
    computers. The words follow the empty list of the largest orgs in
    the app: "The orgs with the most workspaces show here." The
    workspaces by state above the list still give the Running count.
  - The rows show no initials tile beside the org name, as the largest
    orgs do. Reason: the page column is 640 px or less, and in the narrow
    desktop frame of the catalogue the tile cut off the org names and the
    Suspended mark.
  - The workspace number goes under the owner's login, as the label of
    the header writes it, such as `W-12`. The state mark goes under the
    run length: the glyph of the header and its word. A phone keeps only
    the org and that run cell. Reason: five columns fit the page column,
    and the run cell is the same on a phone and on a desktop.
  - A run length gives its two largest units, such as 3d 4h or 5h 12m. A
    run under an hour gives its minutes, such as 48m, and a run under a
    minute its seconds, such as 41s. Reason: the chat writes lengths in
    the same units, such as 1h 12m, and the column stays narrow.
  - The last activity uses the words of `formatWhen` in `src/app/time.ts`:
    3 minutes ago, Yesterday, or 5 Nov. Reason: an idle time of minutes
    or hours needs a relative time, and an older time shows the day, as
    the other operator lists do.
  - The mark of a suspended owner goes under the login, and the workspace
    number moves to a third line. Reason: the column is too narrow for
    the number and the mark on one line, and the mark beside the login
    reads as the state of the owner.
  - A phone adds a line under the org for a suspended owner: the login as
    a link to the user page, and the mark. Reason: a phone leaves out the
    owner column, and a mark without the login would read as the state
    of the org.
  - The loading view keeps the place of the section with 10 placeholder
    rows, as it does for the other parts of the Overview.
  - `longRunsCopy.ts` in `docs/mockups/src/components/operator/` holds the
    words and the run length format. It imports no fixture, so the app
    uses it too, as it uses `operatorCopy.ts`.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

- [x] Add the "Long runs" section to the Overview mockup of
      `app/operator`, beside `LargestOrgs` in
      `docs/mockups/src/components/operator/`, with fixture rows in
      `docs/mockups/src/fixtures/operatorRuns.ts`, beside `operator.ts`.
- [x] Show the desktop and the phone layouts, the empty list, a deleted
      org, and a suspended org. The Overview also shows a suspended
      owner. The child page `app/operator/long-runs` shows a row without
      a cloud computer ID, and its `empty` variant shows the empty list.
- [x] Update `docs/mockups/catalogue-operator.md` and the `app/operator`
      row of `docs/mockups/catalogue.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Add the long runs list to "The Overview" in
      `docs/protocol/operator-section.md`, with long runs decision 1 and
      the known limit.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy
      page in `src/marketing/privacy.ts` and `privacy-uses.ts` in full.
      Update each sentence that restates what the app keeps about a
      workspace or what an operator sees.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates these facts.

## Milestone 3: Run start in D1 and the overview read

Depends on: 2

- [ ] Add the migration `migrations/<YYYYMMDDHHMM>_workspace_running_since.sql`
      with the column and the partial index. Describe it in
      `migrations/README.md`.
- [ ] Write `running_since` in `persistLifecycleState`. Test a start, a
      resume, a stop, an error, and an archive.
- [ ] Set the time in the direct writers that the design names. Test the
      archive of a running workspace, and the stop and the disk restart of
      a deleted org.
- [ ] Add `longRuns` to `OperatorOverview` and to `readOperatorOverview`.
      Test the order, the tie, the limit of 10, archived and stopped rows,
      a null time, a null computer ID, deleted and suspended orgs, and a
      suspended owner.
- [ ] Update the dev fake in `src/app/dev/` and the test fixtures in
      `src/test-support/fixtures/operator.ts`.
- [ ] Update `worker/operator/overview.md` and `worker/lifecycle/README.md`.

## Milestone 4: The Long runs section

Tags: ui

Depends on: 3

- [ ] Add the section to `src/shell/operator/`, as the mockup shows. Keep
      each file under 300 lines. Take its words and the run length format
      from `longRunsCopy.ts` in `docs/mockups/src/components/operator/`.
- [ ] Keep the place of the section in the loading view of the Overview,
      with 10 placeholder rows, as `app/operator/error/loading` shows.
- [ ] Add tests beside the code for the rows, the links, Copy, the empty
      list, the loading rows, and the phone layout. Test the mark of a
      suspended owner on a desktop and on a phone. Test the run length
      format for seconds, minutes, hours, and days.
- [ ] Check the section in a browser with `npm run dev`, on a desktop and
      a phone width.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `CLAUDE.md`.
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

## Post-merge follow-up (non-blocking)

- [ ] On the test deployment, open the Overview and check that a running
      workspace shows its run length within 30 minutes of the deploy.
