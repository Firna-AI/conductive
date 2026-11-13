# Archived workspace removal

Status: Active. On branch `calummoore/quito-q38c`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Archive stops the cloud computer of a workspace and keeps it for 14 days.
In that time a member can restore the workspace. At the end of the 14 days
the app deletes the cloud computer. Today the workspace then stays in the
Archived group at the end of the workspace list with no end, with its
read-only chat (decision 16). Cal asked on 13 November 2026 that archived
workspaces go away after 14 days. This change removes an archived
workspace from the list when its Restore window ends. The app keeps all
its data: the row, the chat, the sessions, and the attached files. A
direct link still opens its read-only chat. The change does not delete
any data, does not change when the app deletes the cloud computer, and
does not add a way to bring a removed workspace back.

Contract owners:

- [Life of a workspace](../docs/protocol/workspace-life.md), sections
  Archive and Restore.
- [Orgs and members](../docs/protocol/orgs-and-members.md), the Archived
  group.
- [Workspace calls](../docs/protocol/workspace-calls.md), the list and
  get calls of the agent tools.
- [Operator section](../docs/protocol/operator-section.md), the workspace
  counts.
- The [tools README](../worker/tools/README.md) and
  [workspace tools guide](../worker/tools/workspaces.md).

## Decisions

### 518. What is left of an archived workspace after 14 days

- **Decided:** 13 November 2026, by Cal. Option D, a new option that Cal
  gave.
- **Background:** at day 14 the app deletes the cloud computer and keeps
  the row, the chat, the sessions, and the attached files. The workspace
  stays in the Archived group with no end.
- **Root question:** when its 14 days end, how does an archived workspace
  go away: from the list, from storage, or both?
- **Options:**
  - **A.** Delete everything: the row, the chat, the sessions, the start
    logs, and the attached files. Effort: Large.
  - **B.** Delete the chat and the files, and keep a deleted row with the
    name, the branch, and the dates. Effort: Large.
  - **C.** Keep the delete of the cloud computer at day 14, and delete the
    chat later, for example at 90 days. Effort: Large.
  - **D.** Keep all the data. Mark the workspace as removed, and take it
    out of the Archived group. Effort: Large. The change reaches the
    mockups, four protocol docs, the legal pages, the guides, the Worker,
    the agent tools, and the app.
  - **E.** An org setting for how long an archived workspace stays in the
    list, 14 days by default. Effort: Large. The options check added it
    after the choice.
- **Left out:** change nothing fails the goal. A manual Remove action
  fails the automatic removal. A Show older control in the Archived group
  is decision 519 C.
- **Chosen:** D. Cal: "keep the data, just mark it as deleted - so a kind
  of soft delete and remove it from the archive list section". The first
  recommendation was A.
- **Closed with it:** two follow-on questions lost their reason, because
  nothing is lost:
  - The archives that are already older than 14 days leave the list at
    once.
  - A suspended org removes its workspaces as normal, because the chat
    stays for the operator.

### 519. Who can still open a removed workspace

- **Decided:** 13 November 2026, by Cal. Option B.
- **Root question:** after day 14, through which ways in can members and
  agents still reach a removed workspace?
- **Options:**
  - **A.** No. A link shows that the workspace was removed. Agent tools
    act as if it does not exist. Effort: Medium.
  - **B.** Only by direct link. A link opens the read-only chat with a
    Removed bar. Agent tools can read it by ID, and their lists leave it
    out by default. Effort: Medium.
  - **C.** Yes, through a separate Removed view or filter in the list.
    Effort: Large.
  - **D.** The command palette search also finds removed workspaces, in
    their own group. The sidebar still leaves them out. Effort: Medium.
    The options check added it after the choice. It can follow when
    members ask to find old work without a link.
- **Left out:** keeping it in the Archived group goes against
  decision 518. Access by role breaks the rule that every member sees
  each workspace of the org. Different access for agents breaks the rule
  that the tools give what a member already sees.
- **Chosen:** B. The first recommendation was A.

### 520. The word for the state after day 14

- **Decided:** 13 November 2026, by Cal. Option A.
- **Problem:** the app keeps the data. The word "deleted" can read as a
  promise that the data is gone.
- **Root question:** which word names a workspace after day 14 without a
  promise that its data is gone?
- **Options:**
  - **A.** The app says "removed" and never "deleted" for the workspace.
    The Privacy page says that the chat and the attached files stay until
    the org is deleted. Effort: Small.
  - **B.** The app says "deleted", and the Privacy page explains that the
    chat and the files stay. Effort: Small.
  - **C.** The app says "deleted", and an admin can ask for a real delete
    of the data. Effort: Large.
  - **D.** Keep the title "Archived on <day>" and add "It left the list
    on <day>." Effort: Small. The options check added it after the
    choice. A reader can miss the change of state.
- **Left out:** "Hidden" and other words with the same claim are option
  A with another word. A real delete on a schedule is decision 518 A,
  which 518 D closed.
- **Chosen:** A. The words of the app then match what the app does.

## Design

Each item is my call unless it names a decision. The date of each call is
13 November 2026.

- **Removed is computed, not stored.** A workspace is removed when
  `archived_at + WORKSPACE_RESTORE_MS` is at or before now. One shared
  helper in `src/shared/workspaces.ts` gives the time of the removal, and
  the Worker and the app both use it. Reason: Restore already ends at that
  time (`worker/lifecycle/archive-data.ts`). No migration, column, or
  cleanup job is needed, and the removal cannot lag behind the end of
  Restore. The delete of the cloud computer stays as it is. The app never
  uses `restoreUntil` to find the removal. That value is null when no
  cloud computer is kept, also before day 14, for example after a failed
  first start (`src/shared/workspaces.ts`,
  `src/shell/workspace/sandbox-view.ts`).
- **Every archived workspace leaves the list at day 14.** This also holds
  in a suspended org and for an archive with no kept cloud computer. Both
  offer no Restore, but both still get the notice before removal below.
- **The list payload keeps removed rows.** `GET /workspaces`
  (`worker/app-api/shell-data.ts`) still returns them, with their
  `archivedAt`. The app takes them out where it builds the groups. Reason:
  chat chips and session links resolve only workspaces in that list
  (`src/chat/links/workspace-links.ts`). Opening a workspace by link also
  puts it back into the client list (`src/app/workspace-detail-order.ts`),
  so a server filter alone does not keep it out of the group. Today the
  list already holds every archived row, so the payload does not grow.
- **One place hides removed rows.** `groupWorkspaces` in
  `src/app/sections.ts` leaves them out. It feeds the sidebar, the phone
  list, the keyboard order, the Archived count, and each palette group.
  A workspace that opens by link goes back into the client list, and
  `groupWorkspaces` still hides it.
- **Member-facing counts count only listed workspaces.** This covers the
  empty state of `OrgHome`, the count of `LeaveOrg`, and `countOwners` in
  `src/members/people.ts` for the Members tab and the Remove member
  dialog. A member removal still moves the removed workspaces of that
  member with the others, because their data stays.
- **The list updates at day 14.** The delete of the cloud computer
  publishes `workspace.updated` on the stream of that workspace only, and
  it can come late. So the list sets a timer for its next removal, with
  `usePassedDeadlines` from `src/app/deadlines.ts`, and groups again when
  it fires.
- **The Removed bar** (decision 520). A removed workspace that opens by
  link shows the archived bar with the title "Removed on <day>". Its text
  says that the workspace left the list, that the cloud computer is
  deleted or is being deleted, and that the chat is read-only. The text
  does not say "deleted" for the workspace. No sidebar row is selected
  for it.
- **The notice before removal** (closes the earlier warning question).
  Before day 14, the archived bar says that the workspace leaves the list
  on that day, also when it offers no Restore. The toast after Archive
  gives that day too.
- **Agent tools** (decision 519). `list_workspaces` leaves out removed
  workspaces by default. A new `removed` filter gives only the removed
  workspaces when it is true. It works with the other filters in the same
  way as each filter does: a list matches each filter. So `archived: true`
  and `state: archived` give the archived workspaces that are not
  removed, and `archived: false` with `removed: true` gives none. Existing
  callers get fewer rows, as decision 519 B asks. `get_workspace` and the
  session reads still take a removed workspace by ID. The `get_workspace`
  reply adds the time of the removal. The state stays `archived`.
- **Operator counts.** The operator overview and org detail count removed
  workspaces in their own Removed group, apart from Archived. The five
  largest orgs still count every workspace, and the doc says so. Reason:
  an operator sees the data that the app keeps. This is an operator view
  only, so Cal can change it at review.
- **No change** to Restore, which already refuses after 14 days. No
  change to the routine run rows, which link by ID and so still open, or
  to the GitHub webhook mapping, which already skips archived rows. No
  change to section delete, which moves removed rows to General with the
  other archived rows.

The items below come from the mockups of Milestone 1. Each is the agent's
call of 13 November 2026.

- **The words.** The app copies them from the mockups:
  `components/workspace/SandboxNotice.tsx`,
  `components/workspace/ArchivedToast.tsx`, and
  `components/palette/paletteFilters.ts` under `docs/mockups/src/`.
  - With Restore: "Archived on <day>", then "Restore it until <day> to
    bring back its files and sessions. It leaves the list on that day."
  - In a suspended org: "Your chat history is available. It leaves the
    list on <day>."
  - Without a kept cloud computer: "Its cloud computer is deleted, and the
    chat is read-only. It leaves the list on <day>."
  - Removed: "Removed on <day>", then "It left the list. Its cloud
    computer is deleted, and the chat is read-only." While a failed delete
    tries again, the body says "is being deleted" in place of "is
    deleted".
  - The panel of a removed workspace has the title "Removed". While the
    delete tries again, its body is "The files and the tools go with the
    cloud computer."
  - The toast after Archive keeps its title and adds the line "It leaves
    the list on <day>."
  - The empty line of the Archived filter of the palette says "Archived
    workspaces of <place> show here for 14 days". Reason: it says where an
    older archive went.
  - The operator row is "Removed". It follows Archived, with the mark of
    Archived.
- **The header and the chip keep Archived.** A removed workspace stays in
  the state `archived`, so the header and the chip keep the word and the
  mark of Archived. Only the bar and the panel say Removed. Reason: the
  agent tools keep the state `archived` too, and `StatusGlyph` and
  `WorkspaceMark`, which the app shares, need no new state.
- **The list beside a removed workspace.** No row is selected. The
  Archived group does not open by itself, because it does not hold the
  workspace, and its count leaves the workspace out. The app opens the
  group by itself only for an open workspace that the group holds
  (`useArchivedOpen` in `src/shell/list/ArchivedGroup.tsx`), so this
  follows when `groupWorkspaces` leaves the removed workspace out.
- **The shared notice type gets an optional `removed` mark.**
  `SandboxNoticeState` in
  `docs/mockups/src/components/workspace/sandboxNoticeState.ts`, which the
  app imports, adds `removed?: boolean` to the archived notice. `ended`
  now means removed too. The mark is optional, so the app compiles until
  Milestone 4 sets it from `archivedAt`.
- **The operator count type gets an optional `removed`.** `StateCounts`
  in `docs/mockups/src/fixtures/operator.ts`, and `WorkspaceStates`
  beside it, which the app shares, draw the Removed row only for a count
  with `removed`. The fixture splits the 828 archived workspaces into 203
  archived and 625 removed. The operator fixture of the app tests
  (`src/test-support/fixtures/operator.ts`) reads that fixture, and
  `readWorkspaceStates` in `src/app/api/read-operator.ts` drops
  `removed`. So `src/shell/operator/OverviewTab.test.tsx` fails until the
  app reads `removed` and the test expects the Removed row. Then
  `removed` becomes required, and `OverviewLoading` gets a fifth row.
- **The deletion words keep their follow-up.** "Its cloud computer is
  deleted" can still name a delete that the app did not confirm, as
  `plans/follow-ups/archived-computer-certainty.md` says. This change
  keeps those words before and after day 14, so that follow-up stays
  open.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Update the Archive flow and the Archived group in the catalogue.

- [x] Take the fixtures older than 14 days out of the Archived group
      (`docs/mockups/src/fixtures/archivedWorkspaces.ts`). Keep
      `postcodeLookup` as a removed workspace for the chip fixtures.
- [x] Bar: add the line on the day that the workspace leaves the list to
      the Restore text. Change the title of the states after Restore to
      "Removed on <day>" (`components/workspace/SandboxNotice.tsx`).
- [x] Toast after Archive: give the day that the workspace leaves the list
      (`components/workspace/ArchivedToast.tsx`).
- [x] Archive screens: rename "Restore ended" and "Cloud computer
      deleted" to Removed states. Show that the Archived group holds no
      removed row, and that the chip of a removed workspace opens it.
      Update the decision note of `entries/app/archive/index.mockup.tsx`.
- [x] Operator overview: add the Removed count.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

The catalogue now has `app/archive/no-computer`, and `app/archive/removed`
with its `deleting` variant, which moved from `app/archive/deleted` and
`app/archive/restore-ended`. The removed workspace of the mockups is
Postcode lookup for the shipping and billing forms, `W-372`, removed on
29 October. Its chip in `app/workspace-links` opens it, as
`user-flows/open-a-removed-workspace` shows.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] `docs/protocol/workspace-life.md`: Archive and Restore give the
      removal at the end of Restore, decisions 518, 519, and 520. Replace
      the requirement of decision 16 that the chat stays in the Archived
      group.
- [ ] `docs/protocol/orgs-and-members.md`: the Archived group holds only
      the workspaces whose Restore has not ended.
- [ ] `docs/protocol/workspace-calls.md`: the default of the list, the
      `removed` filter, and the removal time of `get_workspace`.
- [ ] `docs/protocol/operator-section.md`: the Removed count, and the
      top five orgs that count every workspace.
- [ ] `docs/protocol/command-palette.md`: the Archived filter and the
      search leave out removed workspaces.
- [ ] `docs/protocol/workspace-links.md`: a link to a removed workspace
      still opens it.
- [ ] Update the member counts in `docs/protocol/orgs-and-members.md` and
      in any doc that gives the count of the Remove member dialog.
- [ ] Read the Terms page and the Privacy page in full. Update each
      sentence that restates the Archive facts. The Privacy page says
      that the chat and the attached files stay until the org is deleted.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence on the Archived group and on the chat after 14 days:
      `workspaces.md`, `sessions-and-chat.md`, `overview.md`,
      `security.md`, and `pull-requests.md` at least.
- [ ] Update the notes of the Archive rows of the comparison page
      (`src/marketing/from-conductor/areas/workspaces-and-branches.ts`).
      Their statuses stay.
- [ ] Update `worker/tools/README.md`, `worker/tools/workspaces.md`, and
      `tools/calls.md`.

## Milestone 3: Worker and agent tools

Depends on: 2

- [ ] Add the shared removal helper to `src/shared/workspaces.ts`, with
      its tests.
- [ ] `list_workspaces`: leave out removed workspaces by default, and add
      the `removed` filter (`worker/tools/workspace-data.ts`,
      `worker/tools/workspace-input.ts`,
      `src/shared/agent-workspaces.ts`).
- [ ] Add the filter to the MCP schema, the CLI, and their help
      (`tools/workspace-mcp-tools.ts`, `tools/list-input.ts`,
      `tools/workspace-cli.ts`, `tools/cli-help.ts`,
      `tools/cli-options.ts`).
- [ ] `get_workspace`: add the removal time (`worker/tools/workspace-data.ts`,
      `tools/responses.ts`).
- [ ] Operator counts: add the Removed group
      (`worker/operator/workspace-counts.ts` and its readers).
- [ ] Tests: list default and filter, read by ID of a removed workspace,
      session reads, operator counts.

## Milestone 4: App

Tags: ui

Depends on: 1, 3

- [ ] `groupWorkspaces` leaves out removed rows, with the timer for the
      next end of Restore.
- [ ] Count only listed rows in `OrgHome`, `LeaveOrg`, and `countOwners`
      (`src/members/people.ts`).
- [ ] The bar and the chat fallback bar give the Removed title and the
      notice before removal, from `archivedAt`, not from `restoreUntil`
      (`src/shell/workspace/notice-copy.ts`,
      `src/shell/workspace/sandbox-view.ts`,
      `src/shell/workspace/WorkspaceScreen.tsx`,
      `src/chat/components/SandboxState.tsx`).
- [ ] The toast after Archive gives the day that the workspace leaves the
      list (`src/shell/workspace/useArchiveActions.ts`).
- [ ] The operator overview shows the Removed count. Read `removed` in
      `readWorkspaceStates` (`src/app/api/read-operator.ts`), make
      `StateCounts.removed` required, add a fifth row to
      `OverviewLoading`, and update `OverviewTab.test.tsx`, which fails
      since Milestone 1 split the shared operator fixture.
- [ ] Copy the Milestone 1 words into the palette empty line of the
      Archived filter and its tests in `src/app/palette`.
- [ ] Keep the removed rows in the dev and test fakes of the list, as
      the Worker does (`src/app/dev/workspace-routes.ts`,
      `src/test-support/fake-workspace-routes.ts`). Add a removed row to
      their seed data.
- [ ] Tests: the group, the palette, the timer, the bar, the toast, and a
      chip that opens a removed workspace.
- [ ] Check the list, the bar, and a chip link in the browser.

## Milestone 5: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4

- [ ] Run the targeted tests and `npm run check`.
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
