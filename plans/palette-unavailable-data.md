# Command palette: data that did not load

Status: Active. On branch `calummoore/untitled-v2`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The command palette searches the workspaces of the current org, their
repository names, the actions of the page, and the settings. Pull request
#77 added it. Its review found that the palette can give a partial answer
as a complete one (finding 3, repeated as finding 5):

- After a failed first read of the workspace list, a search on the All
  tab says "Nothing matches".
- Beside matches of actions or settings, the workspace rows are missing
  without a notice.
- With an empty field, the All tab drops Recent workspaces without a
  notice.
- While the repository names load, or after they fail, a search by a
  repository name says "Nothing matches".

The follow-up item `plans/follow-ups/palette-unavailable-data.md` recorded
the options. On 9 November 2026 the user chose option D, as decision 164.
So no brainstorm ran. This change keeps the load state of the workspace
list and of the repository names in the palette. While that data loads,
or after it fails, each tab that shows workspaces says so in place of its
workspace groups, keeps its action and setting rows, and offers Try again.
"Nothing matches" then shows only after a search over loaded data. This
change does not send the repository names with the workspace list
(option E), and it does not change the header of a workspace, which
`plans/follow-ups/header-repository-id.md` covers.

Contract owners:

- [Command palette: empty and unavailable states](../docs/protocol/command-palette-states.md),
  and its link in [Command palette](../docs/protocol/command-palette.md).
- The [mockup catalogue](../docs/mockups/catalogue.md).
- The [web app README](../src/app/README.md) and its
  [Screens](../src/app/screens.md) page.

## Design

Each line that starts with "Agent call" is a design call of the agent,
made on 9 November 2026. The user can change it before the work merges.

- Agent call: the palette tracks two reads apart: the workspace list
  (sections and workspaces) and the repository names. Each is loading,
  failed, or ready.
- Agent call: without a query, the workspace rows need only the list. A
  row shows its repository when the names arrive, and no internal ID
  before. With a query, the workspace groups need the list and the names,
  because a search looks at the repository name.
- Agent call: when the workspace groups of a tab can not show, one status
  part takes their place: a spinner while the data loads, or a notice
  with Try again after a read failed. On the All tab it stands where the
  first workspace group stands: before Actions with an empty field, and
  first with a query. On the Workspaces tab it fills the tab, as it does
  today.
- Agent call: the notice names what failed. A failed list says "The
  workspaces didn't load", as the list page says. Failed names say "The
  repositories didn't load". Try again reads again each read that failed.
- Agent call: the Actions and the Settings tabs show no status part,
  because they show no workspace.
- Agent call: "Nothing matches" shows only when the tab has no row and no
  status part. A status part with no other row stands alone, without
  "Nothing matches".
- Agent call: the repository filter of the Workspaces tab lists the
  repositories when their names arrive. Until then it offers only All
  repositories.
- Agent call, from the mockups: the status part is not a row. The first
  row after it is highlighted, so Enter runs that row, and Up and Down
  skip the status part. Reason: the keys move between results, and the
  status part is not a result.
- Agent call, from the mockups: on desktop, the list behind the palette
  shows the same failure, because both read the same workspace list.
  Reason: a list with its workspaces beside a palette that says they did
  not load is a state that the app can not reach.
- Agent call: when one read that a tab needs failed and the other still
  loads, the status part is the notice of the failed read. Reason: the
  person can act on a failure at once. When both reads failed, the notice
  says "The workspaces didn't load". Reason: a failed list hides every
  workspace row. Try again reads again each read that failed.
- Agent call: `app/command-palette/search` draws failed repository names
  in a fifth variant, `repositories-unavailable`. The texts of the search
  variants say where the status part stands with an empty field. Reason:
  the variant draws the second notice that the protocol states, and the
  All tab page has child pages, so it shows only one screen.
- Agent call: the empty and unavailable states move from
  `docs/protocol/command-palette.md` to their own page,
  `docs/protocol/command-palette-states.md`. Reason: the doc passed 250
  lines, and the `documentation` skill splits such a doc. The key sections
  stay, because another workspace edits them.

## Decisions

### 164. Choose how the palette shows data that did not load

- **Chosen:** D, by the user on 9 November 2026: keep the load state of
  the list and of the repository names in the source and the results, and
  show the spinner or the failure with Try again in place of the
  workspace groups on each tab that shows workspaces.
- **Rejected:** A, the failure only when a search finds no row; B, an
  incomplete-search notice beside the matches; C, A with one line in the
  doc; E, the repository names sent with the workspace list; F, D with E.
  The follow-up item `plans/follow-ups/palette-unavailable-data.md` gives
  each option in full, and this change deletes it.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The palette mockups draw the status part on the All tab and on the
Workspaces tab, on desktop and on a phone.

- [x] Add the `loading` and `unavailable` variants to
      `app/command-palette/search`: a query that matches actions and
      settings, with the spinner, or with the notice and Try again, in
      place of the workspace groups.
- [x] Add the `unavailable` variant to `app/command-palette/workspaces`:
      the notice of a failed list with Try again.
- [x] Add the `repositories-unavailable` variant to
      `app/command-palette/search`: the list is ready, the repository
      names failed, and the notice "The repositories didn't load" with Try
      again stands in place of the workspace groups.
- [x] Draw the same failure in the list behind the palette, in the two
      variants whose list failed. `LoadFailure` in
      `docs/mockups/src/components/common/` draws each list that did not
      load, also on the invitations page.
- [x] Update `docs/mockups/catalogue.md`.
- [x] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run file-length:check`. Smoke-test the new pages in light
      and dark, on desktop and on a phone.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: the check logs are in `.context/palette-unavailable-data/`, and
the screenshots are in `.context/command-palette/shots/`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] State decision 164 in the section "Empty states" of
      `docs/protocol/command-palette.md`: the status part, its words, Try
      again, the rows that stay, and when "Nothing matches" shows.
- [x] State the rule for a read that failed while the other loads, and
      for two failed reads.
- [x] Move the empty and unavailable states to
      `docs/protocol/command-palette-states.md`, with a link from
      `docs/protocol/command-palette.md`. Add the page to the protocol
      lists of `docs/architecture.md` and `README.md`.

## Milestone 3: The status part in the app

Tags: ui

Depends on: 2

- [ ] Keep the load state of the repository names in the palette source,
      beside the list.
- [ ] Build the status part in the results: where it stands on each tab,
      the spinner, and the notice of each failed read. Keep the action and
      setting rows. Show "Nothing matches" only after a search over loaded
      data.
- [ ] Make Try again read again each read that failed.
- [ ] Test in Node each state: the list loading and failed, with and
      without a query; the names loading and failed, with and without a
      query; one read failed while the other loads, and both failed; and a
      search over loaded data without a match.
- [ ] Extend the mounted test of the failed list to the All tab, with a
      search that also matches an action, and Try again.
- [ ] Update `src/app/screens.md` and the Key code of `src/app/README.md`
      where they describe the palette results.
- [ ] Delete `plans/follow-ups/palette-unavailable-data.md`.

## Milestone 4: Verification, commit, review, and pull request

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
- [ ] Open the pull request. Its description gives the decision and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds or deletes.
