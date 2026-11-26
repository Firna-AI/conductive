# Pull request merges on the Stats tab

Status: Active. [PR #593](https://github.com/Firna-AI/conductive/pull/593) is open. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Stats tab of the Account page shows counts of the person signed in:
workspaces, automations, orgs, and automation runs. This change adds the
pull requests of the person's workspaces that merged on GitHub. The tab
gets a tile with the total and the merges of the last 7 days, and a chart
of the merges of each UTC day of the last 30 days. The app records each
merge in a new D1 table at the time that it sees the merge. The counts
start on the day that the change ships. No scan recovers older merges.

The change does not count pull requests from outside Conductive. It does
not add merges to the operator section. Open decisions 3 and 5 say which
roles of a person count and how the tab shows them.

Contract owners:

- [Account stats](../docs/protocol/account-stats.md), [the GitHub banner](../docs/protocol/github-banner.md), and [data and trust](../docs/architecture/data-and-trust.md).
- The [GitHub README](../worker/github/README.md), the [App API README](../worker/app-api/README.md), and the [migrations README](../migrations/README.md).

## Decisions

The user answered decisions 1 and 2 on 2026-11-17, after a brainstorm of
the same day. Decisions 3, 4, and 5 are open. A decision here is a "merge
stats decision". Account stats decisions 1 and 2 came from #405.

### Merge stats decision 1. How to count the merges of a person

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/account-stats.md`, `worker/app-api/account-stats.ts`.
- **Background:** The Stats tab reads its counts in one D1 batch each time
  that it opens. Account stats decision 2 says that the tab shows only
  counts that the app already records, and that a read wakes no workspace.
  D1 keeps only the current bar state of each workspace branch, with no
  merge time. Continue clears that state and adds 1 to
  `workspaces.task_number`, which exists only since 16 November.
- **Problem:** No option keeps account stats decision 2 and also gives
  correct merge counts by day.
- **Impact if no action:** The tab shows no merges.
- **Root question:** How should the Stats tab show the pull request merges
  of the person signed in?
- **Options:**
  - **A.** Count the Continues and the current `merged` states of the
    workspaces that the person owns, in one tile with no chart. No
    migration. It misses older merges and moves past merges with a new
    owner. Effort: Medium.
  - **B.** Record each merged pull request of a workspace branch in a new
    D1 table, with the merge time and the owner at that time. The tab gets
    a total, the 7-day change, and a 30-day chart. It changes account
    stats decision 2. Effort: Large.
  - **C.** Search GitHub with the person's token at each read. It gives the
    full history, but it counts work outside Conductive, waits seconds for
    GitHub, and meets the search rate limit. Effort: Large.
- **Left out:** A read of each workspace object at each read, a count of
  the Merge button only, a record by GitHub account, a general activity
  record, a link to GitHub, and no change. The brainstorm gave each reason.
- **Previous examples:** The Stats tab came from #405 (`570ce506b`).
- **Recommendation:** B. Only B gives the per-day shape of the other counts
  from a cheap read.
- **Options check (2026-11-17):** It kept B. It added **D.** Keep the
  record of B, but credit the member whose GitHub account opened the pull
  request, with the owner as the fallback. Effort: Medium, on top of B.
  Open decision 3 asks about D.
- **Outcome:** The user chose B on 2026-11-17. This changes account stats
  decision 2 for merges only: the app records a new fact for the tab.

### Merge stats decision 2. Whether to count past merges

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** None.
- **Background:** A new table holds only the merges after its release. The
  event history of each workspace object holds the merged bar states since
  6 November, with the merge times.
- **Problem:** Without a scan, the counts start at zero on the release day.
- **Impact if no action:** Merges before the release never show.
- **Root question:** Should the merge counts include the merges from before
  the release?
- **Options:**
  - **A.** Count only the merges after the release. No extra work. Effort:
    Small.
  - **B.** Run a one-time scan of the event history of each workspace
    object. It wakes each workspace once. Recovered rows use the owner
    now. Effort: Medium.
- **Left out:** Recovery from the task numbers: they hold no merge times
  and start on 16 November.
- **Recommendation:** B, to keep the reason of account stats decision 2.
- **Options check (2026-11-17):** It added three options. **C.** Keep each
  older merge that a refresh sees after the release. Effort: Small. **D.**
  Each workspace object scans its own history once, at its next wake.
  Effort: Medium. **E.** A one-time job reads from GitHub the merged pull
  request of the current branch of each workspace. Effort: Medium. It
  recommended B with E. It also found that the refresh records older
  merges, which A did not plan for. Open decision 4 asks about that.
- **Outcome:** The user chose A on 2026-11-17. The counts start on the
  release day. The protocol doc says so.

### Merge stats decision 3. Which roles of a person count (open)

- **Root question:** Which roles of a person in a merged pull request does
  the tab count? The user proposed on 2026-11-17 a split by "merged",
  "contributed", and "who owned it". It replaces the earlier question of
  the owner or the opener.
- **Options:**
  - **A.** The owner only. Effort: Small.
  - **B.** The owner, the opener, and the merger that GitHub names. No new
    GitHub request. Effort: Medium.
  - **C.** The owner, the merger, and the commit authors. One more GitHub
    read for each merge. Effort: Large.
  - **D.** The owner, the merger, and the contributors: the opener and each
    member who sent a message on the branch before the merge. The
    workspace object finds the senders once, when it records the merge.
    Effort: Large.
- **Left out:** A row for each turn in D1: it breaks account stats
  decision 2 beyond merges. Resolving the people at read time: it stores
  GitHub IDs of non-members.
- **Recommendation:** D. Work in Conductive happens in agent turns, so only
  D credits each member who took part.

### Merge stats decision 5. How the tab shows the roles (open)

- **Options:**
  - **A.** One tile with the merges where the person had any role. Effort:
    Small.
  - **B.** A, plus one line under the tile with the count of each role.
    Effort: Small.
  - **C.** One tile for each role. Effort: Small.
  - **D.** B, plus a role switch on the chart. Effort: Medium.
- **Recommendation:** B. A person who works alone has every role, so
  separate tiles show one number three times.

### Merge stats decision 4. Older merges that the app sees after the release (open)

- **Root question:** Do merges from before the release count when the app
  sees them after the release?
- **Options:**
  - **A.** No. The app records only merges with a GitHub merge time after
    the release time that the migration stores. Effort: Small.
  - **B.** Yes. The app records each merge that it sees. Some older days
    then fill in when a person opens an old workspace, and others never
    do. Effort: Small.
- **Recommendation:** A. It matches decision 2 and gives the tab one clear
  start day.

## Design

Each item below is my call unless it names a decision, made on 2026-11-17
with its reason.

- **The record.** A new D1 table, `pull_request_merges`, holds one row for
  each merged pull request of a workspace branch: the repository ID, the
  pull request number, the org, the workspace, the owner user, the GitHub
  merge time, and the time that the app recorded it. Its primary key is
  the repository ID and the number, so a repeated insert changes nothing.
  An index on the owner and the merge time serves the read. My call:
  a pull request merges once, and the Stats read stays an index range.
  The owner is a column of the row, because every option of decision 3
  counts the owner. Other roles get their own table after decision 3. My
  call, 2026-11-20.
- **The roles.** Open decisions 3 and 5. A role names a member at the
  time that the app records the merge. A merge counts once in the total
  of a person, whatever the roles. One pull request counts once, also when two workspaces share its
  branch. My call: the key is the repository and the number.
- **The time.** A merge counts on the UTC day of its GitHub merge time.
  My call: a late record still lands on the right day.
- **Where the app records.** Two paths insert with `ON CONFLICT DO NOTHING`:
  - The GitHub refresh, where it copies the summary to D1
    (`worker/github/refresh.ts`). A snapshot whose banner is `merged`
    inserts the row. This covers merges from the Merge button, merges on
    GitHub, and a tab that opens a workspace after a missed webhook.
  - The verified `pull_request` webhook with `closed` and `merged: true`
    (`worker/github/webhook.ts`). It inserts a row for the oldest workspace
    of the repository and the head branch, also an archived one. It makes no
    GitHub read. My call: GitHub sends no refresh to an archived
    workspace, and a merge after Archive is common.
  - A failed insert fails the refresh or the delivery, as for the summary
    copy. GitHub does not resend a failed delivery, so an archived
    workspace can lose a merge. My call: no new retry job.
- **What counts.** Every merge method and every base branch count. A
  closed pull request that did not merge does not count. A later revert
  removes no merge. Merges in deleted orgs count nowhere. Merges in
  suspended orgs count. My call: these follow the other counts of the tab.
- **Purges.** The rows reference their org with `ON DELETE CASCADE`, so
  the org purge in `worker/members/purge-data.ts` removes them. The table
  has no foreign key to the workspace, so it does not block the purge of
  workspaces. My call: `automation_runs` goes the same way.
- **The start day.** Open decision 4. The record saves each merge that
  the app sees, also an older one. Decision 4 then only sets a filter of
  the read. My call, 2026-11-20: the record then serves both options.
- **The read.** `readAccountStats` adds two queries to its batch: the
  totals of all time and of 7 days, and the counts of 30 UTC days. Each
  joins the live orgs, like the other counts.
- **The wire.** `AccountStats` gains `mergedPullRequests: { total, lastWeek }`
  and `mergedPullRequestsByDay`. Both only add data, so older tabs and
  older Mac apps keep working.
- **The tab.** A fifth tile, "Merged pull requests", with the 7-day change,
  and a third chart, "Merged pull requests". The mockup milestone checks
  the layout of five tiles on a phone, and whether the tab needs a note
  that the merges count from the release day.

PR #420 changed the same Stats files. It merged on 2026-11-17, and this
branch merged `origin/main` after it.

The user said "impl" on 2026-11-18 and 2026-11-20, with decisions 3, 4,
and 5 still open. Milestone 2 then ran before the mockups, because no open
decision changes the record. My call, 2026-11-20.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Stats tab of the account at `app/account/stats`, in the browser and the
phone layouts, with its loading and failed states.

- [x] Check PR #420. When it merged, merge `origin/main` into this branch.
- [ ] Add the "Merged pull requests" tile with its 7-day change to
      `docs/mockups/src/components/settings/StatsSections.tsx`.
- [ ] Add the "Merged pull requests" chart of 30 UTC days there.
- [ ] Add the new numbers to `AccountStatsNumbers` and to
      `docs/mockups/src/fixtures/accountStats.ts`, with a fixture of a
      person with no merges.
- [ ] Update the loading placeholders for the new tile and chart.
- [ ] Show that the merge counts start on the release day.
- [ ] Run `npm run mockups:check`. Smoke-test the page in both layouts.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: The merge record

Depends on: none

- [x] Add the migration of `pull_request_merges` with its indexes, and its
      note in `migrations/README.md`.
- [x] Insert a row from the refresh of a `merged` snapshot, beside the
      summary copy.
- [x] Insert a row from the merged `pull_request` webhook, also for an
      archived workspace. Keep `merged_at` in the webhook parser.
- [x] Check that the org purge removes the rows.
- [x] Add tests: a repeated insert, the owner at record time, a closed
      pull request, an archived workspace, a missing merge time, a deleted
      org, and the purge.
- [x] Update `docs/protocol/account-stats.md` with merge stats decisions 1
      and 2, `docs/protocol/github-banner.md`, and
      `docs/architecture/data-and-trust.md`.
- [x] Read both legal pages and each public guide in full. Update each
      sentence that the record makes wrong.
- [x] Update `worker/github/README.md` and `worker/github/verification.md`.
- [x] Check each relative link of each changed Markdown file.

## Milestone 3: The roles, the read, and their docs

Depends on: 2, and decisions 3, 4, and 5

- [ ] Record the roles that decision 3 chooses.
- [ ] Add the queries to `readAccountStats` and the fields to
      `AccountStats` in `src/shared/account.ts`, with the filter of
      decision 4.
- [ ] Add the fields to the dev fake in `src/app/dev/account-stats.ts`.
- [ ] Add tests: the roles, the merge day, and the 7 and 30 days.
- [ ] Update `docs/protocol/account-stats.md` with what the tab shows, and
      `worker/app-api/README.md`.

## Milestone 4: The Stats tab

Tags: ui

Depends on: 1, 3

- [ ] Pass the new numbers from `StatsTab` to the mockup sections, when
      the mapping needs a change.
- [ ] Update `src/shell/account/StatsTab.test.tsx`.
- [ ] Check the tab in a browser with the dev fake, in both layouts.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
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

- [ ] After the deploy, merge a test pull request from a workspace. Check
      that the Stats tab counts it on the right day.
