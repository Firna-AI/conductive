# Workspace marks show the GitHub state

Status: Active. On branch `calummoore/bootstrap-v143`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The mark of a workspace in the workspace list is a 3 × 3 grid of cells.
Today it draws the state of the agent and of the cloud computer, with one
shape for each state. So a workspace can show a green "Ready" mark in the
list while its pull request bar says "1 check failed" in red. This change
makes the list mark show the GitHub state of the pull request in one
colour, and its motion show whether the agent works. The header of the
workspace keeps the state of the agent and of the cloud computer.

The change does not cover the pull request bar, the Checks tab, the reply
of the agent tools, or a live push of list changes. PR #176 changes the bar
at the same time.

## User decisions

List mark decision 1, chosen by the user on 10 November 2026 in the
messages of this workspace:

- The list mark is one full colour for the GitHub state of the pull
  request: red when the checks failed, amber while the checks run, green
  when the checks passed, and purple after the merge.
- A still mark means that the agent does not work. A moving mark means
  that the agent works.
- A workspace without a GitHub state whose agent does not work shows a dim
  mark.
- The workspace shows the state of its cloud computer inside it, in the
  header, as today.
- Rejected: one shape for each state of the agent and the cloud computer,
  the list mark before this change. Reason: the list and the pull request
  bar disagreed, and the user wants the checks at a glance.

## Design calls

My calls, on 10 November 2026:

1. The colour comes from the checks of the Checks tab, with the rules of
   the bar: a failed, cancelled, timed-out, or action-required check is a
   failure, and a queued or running check runs. A failure wins over a
   check that runs. The merge wins over the checks. Reason: the user named
   the CI state and the merge.
2. A merge conflict, changes requested, a draft, and a block do not change
   the colour. Reason: the user named only the checks and the merge.
3. A pull request closed without a merge shows the dim mark, as a branch
   without a pull request does. Rejected: red, as GitHub draws a closed
   pull request, because red means failed checks in the list. Rejected:
   the colour of its checks, because a closed pull request needs no
   action.
4. A light runs around the ring of the mark while the agent works. The
   whole mark pulses slowly while the agent needs input, so the list keeps
   needs input, as decision 68 requires. All other states are still:
   unread, ready, starting, stopped, and error. Rejected: a still middle
   column for needs input, because the user asked for a mark of one full
   colour.
5. With reduced motion, a working mark shows a still ring, and a mark that
   needs input shows a still middle column. The other cells stay dim.
   Reason: the state of the agent stays visible without motion.
6. An archived workspace keeps its faint mark without colour. Reason: a
   chip of an archived workspace must show the archive, as
   [Chips](../docs/protocol/workspace-links.md#chips) says.
7. Bold text alone marks unread output. Green now means passed checks, so
   the full green square of unread leaves the list.
8. The header and the operator section keep the shape mark of today.
   Reason: they show the state of the cloud computer.
9. The command palette rows and the workspace chips show the list mark,
   because their marks mean what the list marks mean.
10. Rows, palette rows, and chips say the GitHub state in words for screen
    readers, such as "Checks failed", before the words of the state of
    today. Reason: only the colour shows the GitHub state.
11. D1 keeps a copy of the GitHub state of each workspace, in a new column
    of the workspace record. The workspace object writes it after each
    GitHub refresh, in the queue of its refreshes, from the state that it
    stores then. A replay of an older delivery thus cannot write an older
    state. The list read, the lifecycle replies, and the workspace events
    give it with the record. Rejected: a list read that asks the object of
    each workspace, because each list read then wakes the object of each
    stopped workspace, every 5 to 30 seconds for each open tab. Rejected:
    a read of the bar of each workspace from the browser, because each
    read asks GitHub.
12. A failed write of the copy fails the refresh, as a failed commit does.
    The retry, the next webhook, or the next open of the workspace writes
    it again.
13. The migration copies nothing. A workspace shows the dim mark until its
    next GitHub refresh. Reason: the app is not in production, and an open
    of the workspace or a webhook refreshes it.
14. A change of the GitHub state does not change the time of the row,
    which gives the last activity.
15. The list reads every 5 seconds, not 30, while a workspace of the org
    has running checks. The wait is a choice of the app, not a product
    limit.
16. The row of the open workspace takes no live update from its GitHub
    events. Reason: the list read follows within 5 seconds while checks
    run, and one source keeps the row and the record in step.
17. One shared function gives the GitHub state for the bar and for the
    copy, so the bar and the mark cannot disagree.

## Contracts

- `GitHubSummary` in `src/shared/github.ts`: `'checks-running'`,
  `'checks-failed'`, `'checks-passed'`, or `'merged'`. `githubSummary`
  gives it from a banner and its checks, or `null`.
- `Workspace.github: GitHubSummary | null` in `src/shared/workspaces.ts`.
- The D1 column `workspaces.github_summary`: nullable, and limited to the
  four values.
- The mark takes the GitHub summary and the state of the workspace. It
  imports no fixture value, so the app uses it too.

Contract owners:

- [Life of a workspace](../docs/protocol/workspace-life.md#workspace-states).
- [GitHub banner](../docs/protocol/github-banner.md#checks).
- [Data and trust](../docs/architecture/data-and-trust.md#where-data-lives)
  and [Components](../docs/architecture/components.md#d1).
- The [GitHub banner backend README](../worker/github/README.md), the
  [App API README](../worker/app-api/README.md), the
  [migrations README](../migrations/README.md), and
  [the design](../docs/mockups/design.md).

Replaced ways:

- The shape mark of `StatusGlyph` in lists → the new list mark.
  Consumers: the workspace row and the palette rows of the mockups, the
  workspace row and the palette rows of the app, and `WorkspaceChip`.
  Moved in Milestones 1 and 4. The header and the operator section keep
  `StatusGlyph`.
- The check rules inside `pullBanner` → `githubSummary`. Consumer:
  `pullBanner` in `worker/github/banner.ts`. Moved in Milestone 3, which
  also deletes `failedCheck` when no caller is left.
- A converter for one milestone: from Milestone 1 to Milestone 4, a chip
  without a GitHub summary draws the shape mark, so the app keeps its
  chips until it gives the summary.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The list, the palette, and the chips get the new mark, at both sizes and
in both schemes. The header keeps its mark.

- [ ] Add a purple `merged` colour to both schemes in
      `docs/mockups/src/design/palette.ts`. Check its contrast on the
      sidebar.
- [ ] Add the list mark beside `StatusGlyph` in
      `docs/mockups/src/components/workspaces/`, with design calls 1 to 7.
      Red is `--ui-rose`, amber `--ui-amber`, green `--ui-success`, purple
      `--ui-merged`, and dim `--ui-muted`.
- [ ] Give each workspace fixture its GitHub summary. Mix every colour
      with a still mark, a working mark, and a mark that needs input. The
      open workspace takes the summary of the bar state of its screen, so
      its row and its bar agree.
- [ ] Use the mark in the mockup parts `WorkspaceRow.tsx`,
      `PaletteRows.tsx`, and `WorkspaceChip.tsx`, with the words of design
      call 10. The chip keeps the converter of the replaced ways.
- [ ] Keep `StatusGlyph` in the header and in the operator section. Make
      its comments say that it draws the state of the agent and the cloud
      computer.
- [ ] Update each text that describes the list mark: the App shell
      rationale, the other entries that describe a mark,
      `docs/mockups/design.md`, and the catalogue pages.
- [ ] Update the label of the phone picture in `marketingPictureList.ts`.
      Capture the pictures again with `npm run marketing:pictures`, and
      look at each changed picture.
- [ ] Run `npm run mockups:check`. Smoke-test the App shell, the palette,
      and the workspace links pages, at both sizes and in both schemes.
      Save the screenshots under `.context/workspace-marks-show-github-state/`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the list mark decision and the design calls that
change a requirement.

- [ ] Rewrite [Workspace states](../docs/protocol/workspace-life.md#workspace-states)
      with list mark decision 1 and design calls 1 to 10. Define the list
      mark decision numbers at the top of the doc, as the gateway doc does.
- [ ] Add one line to [Checks](../docs/protocol/github-banner.md#checks)
      that links to Workspace states.
- [ ] Read [command-palette.md](../docs/protocol/command-palette.md#rows)
      and [workspace-links.md](../docs/protocol/workspace-links.md#chips).
      Change each sentence on marks that the new mark makes wrong.
- [ ] Add the copy of the GitHub state to the D1 rows of
      [Data and trust](../docs/architecture/data-and-trust.md#where-data-lives)
      and [Components](../docs/architecture/components.md#d1).
- [ ] Read the Terms page and the Privacy page in full. Update each
      sentence that restates a changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact, such as the list sentence of
      `workspaces.md`, under the rules of
      [Website docs](../docs/protocol/website-docs.md).
- [ ] Update the notes of the "Sidebar" and "Status indicators" rows in
      `src/marketing/from-conductor/areas/navigation-and-appearance.ts`,
      under the [claim rules](../docs/protocol/conductor-comparison.md#statuses).
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: The GitHub summary in the workspace record

Depends on: 2

The Worker keeps the copy in D1 and gives it in each workspace record.

- [ ] Add `GitHubSummary` and `githubSummary` to `src/shared/github.ts`.
      Make `pullBanner` use it for its check states, and delete
      `failedCheck` when no caller is left.
- [ ] Add `Workspace.github`. Add the migration
      `migrations/<YYYYMMDDHHMM>_workspace_github_summary.sql`, and
      describe it in the migrations README.
- [ ] Select and give the column in each Worker reader of the workspace
      record: `worker/lifecycle/workspace-data.ts`,
      `worker/app-api/shell-data.ts`, `worker/devices/state.ts`, and each
      place that the typecheck names.
- [ ] Write the copy as design calls 11 and 12 say. `refreshWorkspace`
      gives `WorkspaceGitHubState` the D1 write, which changes only a
      different value.
- [ ] Add tests, and see each fail first:
  - [ ] `githubSummary`: a failure wins over a running check, a cancelled
        check fails, skipped and neutral checks pass, the merge wins, and a
        closed pull request or no check gives `null`.
  - [ ] A webhook refresh with a failed check gives `checks-failed` in the
        list reply. A later read with passed checks gives `checks-passed`.
  - [ ] A replay of an older delivery keeps the newer copy.
  - [ ] An unchanged read writes a missing copy.
- [ ] Update the GitHub banner backend README and the App API README.
- [ ] Run `npm run test -- worker/github worker/app-api` and
      `npm run typecheck`.

## Milestone 4: The new mark in the app

Tags: ui

Depends on: 1, 3

The app draws the new mark from the GitHub summary of each record.

- [ ] Read `github` in the three readers of the workspace record:
      `src/app/api/read-workspaces.ts`, `src/chat/api/read-workspace.ts`,
      and `src/members/api/parseCore.ts`.
- [ ] Draw the list mark in `src/shell/list/WorkspaceRow.tsx`,
      `src/shell/palette/PaletteList.tsx`, and through `chipOf` in
      `src/chat/links/LinksContext.tsx`, with the words of design call 10.
- [ ] Delete the converter of the chip, and make its summary required.
- [ ] Make `workspacesWait` in `src/app/org-model.ts` give the short wait
      while a workspace has running checks.
- [ ] Give each workspace of the fake API, the dev fakes, and the test
      fixtures its summary. Let the fake API set it.
- [ ] Add tests, and see each fail first:
  - [ ] A row, a palette row, and a chip say the GitHub state in words.
        Extend `WorkspaceStates.test.tsx` and the existing palette and chip
        tests.
  - [ ] `workspacesWait` gives the short wait for running checks.
- [ ] Update the README of each changed area.
- [ ] Smoke-test with `npm run dev`: the sidebar, the palette, and a chip
      show each colour, and the mark moves while the agent works. Save the
      screenshots under `.context/workspace-marks-show-github-state/`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4

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

- [ ] On the deployment, push a failing check to a pull request of a
      workspace. Its row turns red, then green after a passing run, and
      purple after the merge.
