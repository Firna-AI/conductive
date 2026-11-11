# The branch of a new workspace

This page belongs to the [web app README](README.md#the-branch-of-a-new-workspace).

[The choice of the branch](../../docs/protocol/continue-a-branch.md#the-choice-of-the-branch)
states the requirements.

- The page shows the branch on a line under its repository picker, with
  Use an existing branch, or Change after a choice. The dialog shows a
  quiet picker beside its repository picker. Both use `useBranchPicker`
  of `../shell/new-workspace/useBranchPicker.tsx`, with `BranchLine` and
  `BranchControl` of `BranchChoice.tsx`, and `BranchMenu.tsx` draws the
  picker.
- New branch is the default. `Draft.branch` of `new-workspace-model.ts`
  keeps the chosen row, so the page and the dialog of one draft show the
  same choice, and a close or a failed create keeps it. `chooseBranch`
  also keeps the repository of the row. Another repository, and a create
  that the server accepts, start a new branch again. A create on New
  branch names no branch, and Try again sends the same choice.
- `BranchList` of `branch-list.ts` reads the list route of the Worker, at
  `repositoryBranchesPath`, through the services of the org, so a refusal
  of a suspended org marks the org. `api/read-workspace-branches.ts` reads
  each page. A search runs after a pause of 300 ms, or at Enter, which
  sends no message. The list follows the cursor of a page that a search
  leaves empty before it says that nothing matches. Show more loads the
  next page.
- The list belongs to the form. It keeps its search and its rows while the
  picker closes and opens again, and a new form reads them again. A close
  stops the pause and each read, and an answer after a close, another
  search, or another repository changes nothing.
- The server leaves out the default branch and gives the availability of
  each pull request. `branch-options.ts` holds the rules of a row that the
  draft and the picker share. A pull request whose branch is in another
  repository is a row that is off, with Open on GitHub.
- On a computer the picker hangs below its control, and `within-window.ts`
  keeps it inside the window: it moves left and caps its height as the
  window needs. The search field takes the focus, and the arrow keys move
  from it down the rows and the actions under them, such as Try again.
  Escape and a press outside close only the picker, and the focus goes
  back to its control. Show more, and Try again of a later page, keep the
  focus on Show more while the page loads, and then give it to the first
  row of that page. A phone shows the picker in a sheet, which gives the
  focus to the checked row.
