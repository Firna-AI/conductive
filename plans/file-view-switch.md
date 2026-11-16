# A switch between the changes and the file

Status: Active. On branch `calummoore/file-preview-changes-current-state-honn`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today a changed file has two separate tabs. A press on the file in
Changes opens its diff in a diff tab. A press on the file in All files
opens its current text in a file tab. A diff tab has no way to show the
whole file, and a file tab has no way to show its changes. Only a
Markdown file tab has a switch, between the rendered Markdown and its
source.

This change adds one switch to the header of the tab of a changed file.
The switch shows the changes or the current file in the same tab. For a
Markdown file, the current file shows rendered or as its source, as
today. So the switch of a Markdown file has three views: Changes,
Preview, and Source.

The user asked for this on 16 November 2026, in the message "file preview
should show changes and current file state - you can switch between them
- markdown we can view code/rendered view". That message chose the
approach: one switch, in the file preview, between the changes and the
current state. This plan records it as file view decision 1.

This change does not cover a diff of the rendered Markdown, a diff with
the whole file as context, or a side-by-side diff.

Contract owners:

- [Files and changes](../docs/protocol/workspace-tools.md#files-and-changes).
- [Temporary tabs](../docs/protocol/temporary-tabs.md).
- The [Files screens README](../src/files/README.md) and
  [File tabs](../src/files/file-tabs.md).
- The [Files part](../src/shell/workspace/screen-parts.md#the-files-part)
  of the workspace screen.
- The public guide
  [Files and changes](../src/marketing/docs/files-and-changes.md).
- The [mockup catalogue](../docs/mockups/catalogue-attachments-and-files.md),
  at `app/files/diff`, `app/files/markdown`, and `app/files/code`.

## Design

### The switch

- The header of a file tab or a diff tab shows one segmented control, in
  the place of the Markdown switch of today. It shows only its icons,
  with a tooltip and an accessible name for each segment, as the switch
  of today does.
- A changed file that is not deleted gets a Changes segment, with the
  `FileDiff` icon. "Changed" means that the Changes list holds the path.
- A Markdown file gets Preview, with the `Eye` icon, and Source, with the
  `Code` icon. Each other file gets File, with the `FileText` icon.
- So a changed Markdown file shows Changes, Preview, and Source. A
  changed code file shows Changes and File. A Markdown file with no
  changes shows Preview and Source, as today. A code file with no
  changes, and a deleted file, show no switch.
- The segment of the view that shows is selected.

### The tab

- A press on a segment changes the view of the shown tab in its place in
  the tab row. A diff tab becomes the file tab of the same path, or the
  other way round.
- The tab keeps its temporary state. When the temporary mark named the
  tab, the mark names the tab in its new view.
- The address follows the view, with the addresses of today:
  `files/diff/<path>`, `files/preview/<path>`, and `files/source/<path>`.
  So Back in the browser shows the earlier view.
- The saved view of the workspace keeps the same tab kinds. So the Worker,
  its validation, and the stored views do not change. Older copies of the
  app read each saved view as before.

### Design calls

Each call below is my call, made on 16 November 2026.

- **In-place change of the tab kind.** The switch changes a diff tab into
  a file tab, and back, in the same place. Reason: the user sees one tab
  that switches, and the saved view and the Worker need no new shape. One
  tab kind that holds both views was not chosen, because it needs a
  migration of each stored view and a compatible path for older copies of
  the app. A switch that opens the other view as a new tab was not
  chosen, because a kept tab would then give a second tab, which is not a
  switch.
- **A tab of the other view is open already.** When the tab row holds a
  tab of the other view of the same file, the switch shows that tab and
  closes nothing. Reason: no tab that the user chose closes.
- **The file tab of a changed file has the switch too.** Reason: the
  request asks for both views in the file preview, so the way in, from
  All files, a chip, or Changes, does not matter.
- **The presses of today stay.** A press in Changes, and the chip of a
  file that a turn changed, open the diff. A press in All files, and a
  file chip, open the file. Reason: each list keeps the view that its
  name gives.
- **Open the file stays in the diff of a binary file.** It opens the file
  in the temporary tab, as today. Reason: it is functionality on `main`,
  and the switch does not replace it for a reader who does not see the
  icons.
- **Line targets stay on the file view.** A file chip with lines opens the
  source of the file, as today. A switch to Changes drops the lines from
  the address.
- **One control.** One segmented control holds all the views. Two
  controls, with Changes and File in the first and Preview and Source in
  the second, were not chosen, because they take more of the header on a
  phone.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The diff page, the Markdown page, and the code page of `app/files` show
the new switch. A new screen shows the current file of a changed file.

- [ ] Add the switch to the header of the mockup `FilePage` in
      `docs/mockups/src/components/files/FilePage.tsx`, with the segments
      of the design for each view.
- [ ] Update the descriptions and the rationale of `app/files/diff`,
      `app/files/markdown`, and `app/files/code`.
- [ ] Add a screen to `app/files/diff` that shows the current text of the
      changed file, with File selected. Give it the mobile and the desktop
      variants.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Update
      [Files and changes](../docs/protocol/workspace-tools.md#files-and-changes)
      with the switch, its views, and file view decision 1.
- [ ] Update [Temporary tabs](../docs/protocol/temporary-tabs.md): the
      switch keeps the temporary state of the tab.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update
      `files-and-changes.md`, under "Inspect changes", and each other
      sentence that restates a changed fact.
- [ ] Update `src/files/README.md`, `src/files/file-tabs.md`, and the
      Files part of `src/shell/workspace/screen-parts.md`.

## Milestone 3: The change of view in the shell

Depends on: 2

- [ ] Add `withSwitchedTab(view, from, to)` to
      `src/shell/workspace/files/view-tabs.ts`. It puts `to` in the place
      of `from`, moves the temporary mark, and shows `to`. When the row
      holds a tab of `to` already, it shows that tab only.
- [ ] Add `switchView(from, to)` to `FilesNavigation` in
      `src/files/navigation.ts`, and implement it in
      `src/shell/workspace/files/files-navigation.ts`. It saves the view,
      then moves the address.
- [ ] Give the fakes of the navigation in the tests and the development
      pages the new member.
- [ ] Test `withSwitchedTab` in `view-tabs.test.ts`: a kept tab, the
      temporary tab, and a row with a tab of the other view.

## Milestone 4: The switch on the pages

Tags: ui

Depends on: 3

- [ ] Change `ViewSwitch` in `src/files/page/ViewSwitch.tsx` to take the
      list of views and the shown view, as the design says.
- [ ] Show the switch in the header of `FilePage` and of `DiffPage`. Read
      the changed state and the deleted state from the Changes list of
      the store.
- [ ] Extend `ViewSwitch.mounted.test.tsx` for each set of segments and
      for a press that switches the view.
- [ ] Run the development page of the Files screens and check the switch
      in a browser, on desktop and on a phone width.

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
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.
