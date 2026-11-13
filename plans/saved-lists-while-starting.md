# Saved file lists while a sandbox starts

Status: Active. On branch `calummoore/lima-3o44`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

All files and Changes are the two file lists of a workspace. The runner in
the sandbox reports both lists, and the workspace Durable Object keeps the
last complete copy of each. The Worker serves that copy without the
sandbox, so the lists already show while the sandbox is stopped. But while
the sandbox starts, the files panel shows "Waiting for the sandbox" in
place of both lists. `replacesLists` in
`docs/mockups/src/components/workspace/sandboxNoticeState.ts` returns
`true` for the `starting` state, so a resume hides lists that the app
already holds. An open file tab that showed its file while the sandbox was
stopped also loses it when the start begins. Only the short window before
the reply of the Resume request keeps the lists, from the change of
12 November 2026.

On 13 November 2026 Cal asked for the lists to show at once while a
sandbox resumes, from the copy that the workspace keeps. A file that a
member opens then says that it waits for the sandbox. This change makes
each list show its saved copy while the sandbox starts. The wait shows in
place of a list only when the workspace has no saved copy of it, as on the
first start of a new workspace. A file or diff tab keeps the file that it
already shows, and a tab without content shows "Waiting for the sandbox",
as it does now. The tools, such as Terminal, still wait. The change does
not cover a refused start or a failed first start. Their panels keep their
place, because they carry the words of the refusal or Try again.

Design calls, all made by the agent on 13 November 2026:

- The rule follows the data, not the kind of the start. A list shows when
  the workspace has a saved copy of it, else the wait shows. Reason: the
  same rule then covers a resume, a retry after a later failed start, a
  Restore, and a first start, with no new state. A rule on the kind of the
  start, such as `start.kind !== 'create'`, was not chosen, because it
  shows an error in place of the wait if a resumed workspace has no copy.
- The lists carry no notice that they are a saved copy. Reason: the files
  of a stopped sandbox do not change, so the copy is the latest. The
  stopped state shows the same lists with no notice, and the header
  already shows Starting.
- A file or diff tab keeps the file that it shows while the sandbox
  starts. Reason: the lists keep their copy, and the stopped state already
  keeps the tab's file. A tab that loses its file when the start begins
  was the old behaviour.
- The shared rule splits in two: `replacesShownFile` for a file that a
  tab shows, and `replacesList` with a `saved` flag for a list. The app
  gives `FilesPanel` a `waiting` prop for a list without a saved copy, and
  the mockups mark a new workspace with `isNew`. Reason: the app knows
  which list is saved only from the files store.
- File contents are not stored outside the sandbox. Reason: the request
  accepts the wait for a file, and a stored copy of the repository needs
  new storage and new secret rules.

Contract owners:

- [Workspace life](../docs/protocol/workspace-life.md), Start steps and
  Stop and resume.
- [Workspace tools](../docs/protocol/workspace-tools.md), Files and
  changes.
- The [Files README](../src/files/README.md).
- The public guide
  [Files and changes](../src/marketing/docs/files-and-changes.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The `app/shell/starting` screen shows the saved lists of a resumed
workspace. The new-workspace screens keep the wait in place of the lists.

- [x] Change `replacesLists` so that `starting` keeps the lists. Add the
      rule that a list without a saved copy shows the wait in its place.
- [x] Make `filesPlaceholder` and `FilesContent` in
      `docs/mockups/src/screens/workspaceParts.tsx` show the wait only for
      a new workspace, which `isNew` marks.
- [x] Update the description and the rationale of `app/shell/starting`,
      its `diff` variant, and the `reopen-stopped-workspace` user flow.
- [x] Check `app/new-workspace/creating`, `waiting`, `retrying`,
      `app/attachments/queued`, and `app/routines/run-workspace`. Each
      keeps the wait.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages on desktop
      and on a phone.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] In `docs/protocol/workspace-life.md`, Start steps: the files lists
      show their saved copy while a sandbox starts. A file or diff tab
      without content and the tools wait. A list without a saved copy
      waits.
- [x] In Stop and resume: extend the rule for the open to each start, with
      the reason and the date of Cal's request.
- [x] In `docs/protocol/workspace-tools.md`, Files and changes: a tab keeps
      the file that it shows also while the sandbox starts.
- [x] Read both legal pages and each public guide in full. Update each
      sentence that restates these facts. `files-and-changes.md` says that
      the lists show their last saved copy only while the computer is
      stopped.
- [x] Update `src/files/README.md` when the panel props change.
- [x] Check each relative link of each changed Markdown file.

## Milestone 3: App

Tags: ui

Depends on: 2

- [x] In `src/shell/workspace/files/files-features.tsx`, stop replacing
      the lists while the sandbox starts. Pass the wait to `FilesPanel`
      for a list without a saved copy.
- [x] In `src/files/panel/FilesPanel.tsx`, show that wait in place of
      Loading or the unavailable state of a list without a saved copy.
- [x] Keep `keepShown` true while the sandbox starts, so that a tab keeps
      its file. Keep `pagePlaceholder` as it is.
- [x] Update `StartingPages.test.tsx`, `FilesWiring.test.tsx`, and
      `SandboxNotice.test.tsx`. Add tests: a resumed workspace shows its
      saved lists while it starts, a new workspace shows the wait, a
      shown file stays while the sandbox starts, and a file opened during
      the start shows "Waiting for the sandbox".
- [x] Check the change in a browser with `npm run dev`, on desktop and on
      a phone width.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the design calls of
      this plan with their dates, a permalink to this plan, and the
      follow-up items that the change adds.
