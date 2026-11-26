# Raise the changes report limit

Status: Active. On branch `calummoore/truncation-question-lbd6`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The runner in each sandbox reports the branch changes list to the
workspace Durable Object. A new runner keeps at most 1,000 changed files in
that report, as [Report limits](../docs/protocol/file-reports.md#report-limits)
says. The Changes panel then lists 1,000 files, and a notice gives the
number of files that it leaves out. Cal met a branch with 1,619 changed
files, where the panel left out 619 files (26 November 2026).

The 1,000 limit came from decision M4 = F of 20 November 2026 (commit
`d0801ded8`). Large reports of both kinds passed the 128 MB memory limit
of the Durable Object: the file tree, and earlier changes lists that
filled the stored history. The changes limit also reduced the cost of
each agent edit, because the runner sends the complete changes list after
each scan whose changes data changed. Its measurements, from
the deleted plan at commit `7d89b5a7e`: at 1,000 files, CPU per agent
edit fell from about 55 ms to 27 ms, rows written fell from 82 to 59, and
history growth fell from 0.43 MB to 0.11 MB per edit. Since then, the
stored history keeps only the newest changes list, as
[Chat history](../docs/protocol/chat-history.md) says. So a larger list no
longer grows the history with each edit.

Cal's decision of 26 November 2026: "1 = A, followed by B as a separate
change".

- **A, chosen:** raise the limit of the changes report. This plan.
- **B, chosen as a separate change:** send only the differences of the
  changes list ("changes deltas"). Then the cost of each edit no longer
  grows with the list size. The sub-workspace "Changes list deltas"
  (branch `calummoore/changes-list-deltas-aedi`) brainstorms and plans it.
- **C, not chosen:** keep 1,000.

This change does not change the tree limit, the parts, the revisions, the
omitted totals, the selection order, or the notices. It adds no field and
no protocol version. Older runners already send complete lists. The
Worker and every app accept a list of any count, so the change is
compatible in both directions.

Contract owners:

- [File reports](../docs/protocol/file-reports.md#report-limits).
- [Runner reports](../runner/file-reports.md) and
  [event limits](../runner/event-limits.md).
- [Files and changes guide](../src/marketing/docs/files-and-changes.md).
- [Mockup catalogue](../docs/mockups/catalogue-attachments-and-files.md).

## Decision 1: the new limit

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Performance.
- **Location:** `crates/cnd-runner-interface/src/file_changes.rs:130`.
- **Terms:**
  - **Changes report:** the list of changed files that the runner sends
    to the workspace after a scan whose changes data changed, in parts of
    at most 256 KiB.
  - **Virtual list:** a list that mounts only the rows in view, plus a
    margin.
- **Background:**
  - Cal chose A, whose text said "Raise the limit, for example to
    5,000". The number was an example, not Cal's choice.
  - Each listed file costs about 110 bytes of JSON. For each 1,000 listed
    files, the Worker writes about 220 KB per report and sends about
    110 KB to each open tab.
  - CPU and rows written have a fixed part. A line through the recorded
    27 ms at 1,000 files and 55 ms at about 3,900 files gives about 36,
    65, and 114 ms for 2,000, 5,000, and 10,000 files. These figures are
    older than the current storage, so Milestone 3 replaces them.
  - The Changes panel mounts every listed row when it opens, and
    re-renders every row after each report
    (`src/files/panel/ChangeList.tsx:109`). A measurement of All files
    gives about 0.17 ms for each row at the first draw, as
    `plans/follow-ups/large-changed-folder-first-draw.md` says.
- **Problem:** A higher limit lists more files, but each report of a large
  branch then costs more Worker CPU, storage writes, bytes to each tab,
  and draw time in each tab.
- **Impact if no action:** The plan cannot set the constant.
- **Root question:** How many changed files can Changes list at a cost
  that the workspace object can carry for each report, and that each tab
  can carry for each draw and each report?
- **Options:**
  - **A.** 2,000 files. It covers the branch of 1,619 files that Cal met.
    The list fits one 256 KiB part. Each report of a large branch costs
    about 36 ms of CPU and 220 KB to each tab. The first draw of Changes
    takes about 0.35 s. Effort: Medium.
  - **B.** 5,000 files. It covers branches up to 5,000 files. Each report
    costs about 65 ms of CPU, more than before the limit, and about
    550 KB to each tab in three parts. The first draw takes about 0.85 s,
    and every report re-renders every row. Effort: Medium.
  - **C.** 10,000 files. It covers branches up to 10,000 files. Each
    report costs about 114 ms of CPU and about 1.1 MB to each tab in five
    parts. The first draw takes about 1.7 s. Effort: Medium.
  - **D.** Add a byte budget beside the count. The report keeps files up
    to the count and up to a byte budget of their JSON, such as 256 KiB,
    whichever comes first. The cost stays bounded when paths are long.
    The listed count then changes from one repository to the next, and
    the runner selection, the protocol, and the guide change.
    Effort: Medium.
  - **E.** Choose B or C, and draw Changes as a virtual list. The first
    draw and the work after each report then stay flat as the limit
    grows. Find in the page, the Tab order, the focus of the row menu,
    and screen reader positions need work. One build can also serve All
    files, as option B of the follow-up above proposes. Effort: Large.
- **Left out:**
  - No limit. It brings back an unbounded cost for each report, and
    100,000 files make about 11 MB of JSON in one event.
  - A limit for each workspace. One constant is better on every point,
    because each report costs in proportion to the branch's own list.
  - A slower cadence for large lists. Cal rejected it in M4 = F, and
    each scan must send its changes parts before its tree update.
  - A complete list that the panel asks for on demand. Cal's decision of
    26 November 2026 chose a higher pushed limit now and deltas next.
- **Assumptions:**
  - One runner constant for all workspaces (the code). Kept.
  - Each changed scan pushes the whole list to each tab until changes
    deltas land (Cal's decision of 26 November 2026, item B). Kept.
  - About 110 bytes for each file (the M4 measurement). It holds as an
    average. D drops it.
  - The panel mounts and re-renders every listed row (the code, no
    requirement). E drops it.
- **Wider fix:** E. With Cal's changes deltas, it removes both costs
  that grow with the list: deltas remove the transfer and the storage,
  and E removes the draw and the re-render in each tab.
- **Previous examples:** Decision M4 = F of 20 November 2026 set 1,000.
  `plans/follow-ups/large-changed-folder-first-draw.md` records the draw
  cost of a large list in All files.
- **Recommendation:** A. It covers the branch that Cal met, fits one
  part, and keeps the first draw near 0.35 s until changes deltas and a
  virtual list exist. The first recommendation was B. The options check
  changed it, because 5,000 was an example in the option text and B
  costs more CPU than before the limit. E best protects the codebase.
- **Action:** ask the user, because the options trade coverage against
  the cost of each report and each draw, and no option is clearly best.

Measured cost: Milestone 3 measures the Worker CPU, the rows written, and
the bytes of one report at 1,000 files and at the chosen limit, with two
open tabs. It also measures the first draw and the re-render of Changes
in the browser. When the cost is much higher than the estimate, the
orchestrator reports it to Cal before the pull request. The options
check is in `.context/raise-changes-report-limit/`.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The limited Changes story of the mockups lists 1,000 files and leaves out
1,243. It changes to the new limit.

- [ ] Update `docs/mockups/src/fixtures/limitedFiles.ts` so that Changes
      lists the new limit and leaves out 1,243 files. Update the totals
      and the doc comments.
- [ ] Update the notes of
      `docs/mockups/src/entries/app/files/changes/limited/index.mockup.tsx`
      and `docs/mockups/src/screens/listsState.ts`. Record Cal's decision
      of 26 November 2026 beside the record of M4 = F.
- [ ] Update `docs/mockups/catalogue-attachments-and-files.md`.
- [ ] Run `npm run mockups:check`. Smoke-test `app/files/changes/limited`
      and `app/files/limited` with `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Update [Report limits](../docs/protocol/file-reports.md#report-limits)
      with the new limit and Cal's decision of 26 November 2026.
- [ ] Update `runner/file-reports.md` and `runner/event-limits.md`.
- [ ] Update `src/marketing/docs/files-and-changes.md`. Read every public
      guide in full for other sentences that restate the limit.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy
      page in `src/marketing/privacy.ts` in full. Update each sentence
      that restates the limit. Today none does.
- [ ] Update the follow-up items
      `plans/follow-ups/base-rename-omitted-diff-stale.md` and
      `plans/follow-ups/report-limits-sandbox-check.md`.

## Milestone 3: Runner limit

Depends on: 2

- [ ] Set `FILE_CHANGES_REPORT_MAX_FILES` in
      `crates/cnd-runner-interface/src/file_changes.rs` and in
      `src/shared/files.ts`.
- [ ] Update the development lists in
      `src/test-support/limited-file-lists.ts` and
      `src/files/development.md`.
- [ ] Update the expected texts of the limited list tests, such as
      `src/files/panel/LimitedLists.test.tsx` and
      `src/files/panel/FilesPanel.test.tsx`.
- [ ] Measure the Worker CPU, the rows written, and the bytes of one
      report at 1,000 files and at the new limit, with two open tabs.
      Measure the first draw and the re-render of Changes in the browser.
      Save the result under `.context/raise-changes-report-limit/`.
- [ ] Run the Rust checks and the targeted tests of `AGENTS.md`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [ ] Run the complete gate and the Rust checks named in `AGENTS.md`.
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
