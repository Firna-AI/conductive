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
  `Code` icon. Each other file gets File, with the `File` icon.
- So a changed Markdown file shows Changes, Preview, and Source. A
  changed code file shows Changes and File. A Markdown file with no
  changes shows Preview and Source, as today. A code file with no
  changes, and a deleted file, show no switch.
- The segment of the view that shows is selected.
- On a phone the switch sits in its own bar below the header. Its
  segments show their names and no icons. The header keeps the way back,
  the path, Download, and Copy.

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
- **A bar of its own on a phone.** The mockups showed that three icon
  segments in the header of a phone cut the name README.md to "REA…". So
  on a phone the switch moves to a bar below the header, with the names
  of the views. Reason: the path is the name of the page, and the names
  are clearer than icons on a touch screen. Icons only in the header of a
  phone were not chosen, because the path then loses its room.
- **The `File` icon for the current file.** The plan first named the
  `FileText` icon. The mockups use `File`, because `FileText` is the icon
  of a Markdown file in the tab row and in the header.

## Decisions

This plan names its decisions after the change, as file view decision 1,
as [Decision numbers](../docs/architecture.md#decision-numbers) says.

### 1. A switch between the changes and the file

Chosen by the user on 16 November 2026, in the task message. The tab of a
file preview shows the changes and the current state of the file, with a
switch between them. A Markdown file shows its current state rendered or
as its source.

### 2. A press on a file whose tab shows the other view

Open. Found while the mockups were built, on 16 November 2026.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Behaviour.
- **Location:** `src/shell/workspace/files/view-tabs.ts`, `withActiveTab`.
- **Terms:**
  - **View of a tab:** what the tab of one file shows: its changes, or the
    current file.
- **Background:** A press on a row of Changes opens the diff of the file.
  A press on a row of All files, or on a file chip, opens the file. Today
  the shell finds the tab of a press by its kind and its path. A file tab
  and a diff tab of the same path are two different tabs. A visit by
  address, such as Back, Forward, a reload, or a link, and a click on a
  tab use the same rule, through `useOpenTab` and `navigate`.
- **Problem:** After the switch of decision 1, a tab can show the file in
  the other view. A press in Changes on that file does not find the tab.
  It opens the diff in the temporary tab, so the row can hold two tabs of
  one file. Back after a switch also goes to the address of the earlier
  view, which finds no tab and opens a second one.
- **Impact if no action:** A user who switched a kept tab to File, then
  presses the same file in Changes or uses Back, gets a second tab of that
  file. Back then does not show the earlier view in the same tab, as the
  design of decision 1 says.
- **Root question:** When the shell shows a file in one view, after a
  press, a visit by address, a click on a tab, or the switch, and the row
  already holds a tab of that file in the other view, which tab shows, and
  in which view?
- **Changed by the options check:** The check on 16 November 2026 widened
  the root question from presses to every way in, added D and E, and
  changed the recommendation from B to D. Its report is in
  `.context/file-view-switch/options-check.md`.
- **Options:**
  - **A.** Change nothing. A press finds the tab by its view and its path.
    The row can hold one tab for each view of a file. Effort: Small.
  - **B.** A press finds the tab of the same file in either view. It shows
    that tab in the view of the press, in its place: Changes from a row of
    Changes, and the file from a row of All files or a file chip. Effort:
    Small.
  - **C.** A press finds the tab of the same file in either view. It shows
    that tab in the view that it has. Only the switch changes the view.
    Cost: a chip with lines must show the source at those lines, and an
    address that names the diff must show the diff. So the address and
    the tab can disagree, or the shell rewrites the address and Back seems
    to do nothing. Effort: Small.
  - **D.** B, with one exact rule for every way in. `withActiveTab` first
    looks for a tab with the same view and path. When it finds none, it
    looks for a tab of the same path in the other view, and changes that
    tab to the asked view in its place. When that tab is temporary, the
    mark follows it. Presses, visits by address, clicks on a tab, and the
    switch all use this rule. So the switch is a plain `navigate` to the
    other view, and the shell needs no second function for it. Cost: more
    tests of `withActiveTab`, with a row of two tabs of one file and a Back
    after a switch. Effort: Small.
  - **E.** Make the path the identity of a file or diff tab across the
    shell, so that the view is like the mode of today. This changes
    `sameFilesTab`, `isTemporaryTab`, and `tabKey`. A step on load merges
    two tabs of one path into one tab. Cost: the merge closes a tab that
    the user chose, which the temporary tabs protocol forbids. Older copies
    of the app keep making pairs, so the merge runs again and again.
    Effort: Medium.
- **Left out:** One tab kind in the saved view for both views of a file.
  It gives the behaviour of B or C, but it needs a migration of each
  stored view, so B or C is better on every point.
- **Wider fix:** E. Only E still holds when a new way in does not go
  through `withActiveTab`, or when a third view comes. Its merge closes
  tabs that the user chose, so D stays the recommendation.
- **Previous examples:** The Markdown switch of today. A press on a
  Markdown file whose tab shows Source shows that tab in Preview, in its
  place, as `withActiveTab` does for a mode. It is not a full precedent: a
  mode change keeps the kind and the mark, and a view change rewrites
  both.
- **Recommendation:** D. The way in says which view the user wants, Back
  shows the earlier view in the same tab, and the rule also says which tab
  wins when one file already has two tabs. The options check first named
  B. E best protects the codebase, but its merge closes tabs.
- **Action:** ask the user, because the options change what a press does
  in the lists, and the protocol of temporary tabs states that a press
  finds a tab of the same file or diff.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The diff page, the Markdown page, and the code page of `app/files` show
the new switch. A new screen shows the current file of a changed file.

- [x] Add the switch to the header of the mockup `FilePage` in
      `docs/mockups/src/components/files/FilePage.tsx`, with the segments
      of the design for each view.
- [x] Update the descriptions and the rationale of `app/files/diff`,
      `app/files/markdown`, and `app/files/code`.
- [x] Add a screen to `app/files/diff` that shows the current text of the
      changed file, with File selected. Give it the mobile and the desktop
      variants.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Update
      [Files and changes](../docs/protocol/workspace-tools.md#files-and-changes)
      with the switch, its views, and file view decision 1.
- [ ] Update [Temporary tabs](../docs/protocol/temporary-tabs.md): the
      switch keeps the temporary state of the tab. Add the answer of file
      view decision 2.
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

- [ ] Apply the answer of file view decision 2 to `withActiveTab` in
      `src/shell/workspace/files/view-tabs.ts`, so that the switch changes
      the view of the tab in its place and moves the temporary mark. With
      D, the switch calls `navigate` with the other view. With another
      answer, add a function for the switch to `FilesNavigation`.
- [ ] Apply the same rule to `sameTab` and `withTab` of the development
      page in `src/files/dev/dev-view.ts`.
- [ ] Check `tabKey` in `src/chat/state/tab-order.ts`. A switch changes
      the kind of the tab, so the tab row must not lose the focus or the
      scroll place of the tab. Update its comment.
- [ ] Test `withActiveTab` in `view-tabs.test.ts`: a switch of a kept
      tab, a switch of the temporary tab, Back after a switch, and a row
      that holds two tabs of one file.

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
- [ ] On a phone, show the switch in its own bar below the header, with
      the names of the views.
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
