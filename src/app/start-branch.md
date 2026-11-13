# New workspace: start from a branch

This guide belongs to [Web app: data and composition](README.md). It gives
the rules of the branch control of New workspace, its picker, the target
choice, and the refusals of the branch check, as the app builds them.
[Start from a branch](../../docs/protocol/start-from-a-branch.md) states
the requirements, and the mockups under `app/new-workspace/start-branch`
draw them. The words come from `branchCopy.ts` of the mockups, and the
parts reuse their CSS modules.

## The branch of a draft

- The draft of New workspace holds the branch that the member picked and
  the target that the member chose, as `DraftBranch` in
  `new-workspace-branch.ts`. The page and the dialog of one draft share
  them, as they share the message.
- A branch belongs to one repository. A pick of another repository ends
  the branch and the target. So does a kept repository that gives way to
  the repository that the form shows. A send ends them too, so the next
  draft starts from the default branch.
- A pick of a branch or of a target keeps the repository that the form
  shows in the draft, as the first text does. So a build that turns
  another repository ready does not move a draft with a picked branch.
- A pick of the default branch keeps no name, so the control follows a
  rename of the default branch. The target that the member chose stays
  through each pick in the repository, also through a pick of the default
  branch. Before a choice, the picked branch is the target (decision 295).
- `formBranch` gives what a form shows: the branch of the control, the
  default branch, and the target of a picked branch.
- A create from the default branch names no branch. A create from another
  branch sends `startBranch`, the picked branch, and `baseBranch`, the
  target: the picked branch, or the name of the default branch, which the
  Worker stores as a null base. `branchFields` gives the two fields.
- A failed create keeps the repository and the start branch of its
  request in `CreateState`, so a refusal names them also after a change
  of the form.

## The control and its picker

- `BranchControl` in `../shell/new-workspace/BranchPicker.tsx` stands
  beside the repository picker on the page and in the header of the
  dialog. It always names a branch, and a long name ends in an ellipsis.
- A press opens the picker, which reads the branches of the repository
  again, live. `OrgModel.branches` holds the list of each repository, in
  `branch-lists.ts`. While a read runs, the list loads, also for Try again
  after a failure. Only the answer of the newest read shows.
- A sign-out, or a sign-in of another person, forgets the lists, because
  GitHub shows each member only what that member may read.
- `branchRows` in `branch-rows.ts` gives the rows and the line under them.
  The default branch comes first with the detail `default`, also while the
  list loads, after a failed read, and without access to the repository.
  The other branches follow in the order of the Worker, newest commit
  first, each with the age of its newest commit.
- A search keeps each branch whose name holds the query, in any case, also
  the default branch. The Worker gives every branch of the repository, so
  the app searches the list that it has, with no new read.
- `BranchList` in `../shell/new-workspace/BranchList.tsx` draws the open
  picker. The search field keeps the focus, as the combobox of the rows. A
  search highlights its first match. Up and Down move the highlight with a
  wrap at each end, and Enter picks the highlighted branch. The Firna field
  keeps its key events from the elements around it, so the list hears them
  in the capture phase.
- A pick, Escape, and a press outside close the picker, and the focus goes
  back to the control. Tab closes a picker beside its control. The key of
  the command palette closes it, as it closes a menu.
- On a computer the picker hangs below the control, in the top layer of a
  `PopoverSurface`, so no box clips it. A phone opens it as a sheet.

## The target choice

- `TargetChoice` in `../shell/new-workspace/TargetChoice.tsx` shows only
  for a picked branch that is not the default branch. A computer shows a
  segmented control, and a phone shows two radio cards. The line under the
  choice says what the pull request then holds.
- On the page the choice stands under the pickers. In the dialog,
  `DialogHeader` of `dialog-parts.tsx` puts it on a line of its own under
  the header.

## Refusals of the branch check

- `createFailure` in `../shell/new-workspace/create-failure.tsx` draws the
  notice of a failed create, in its usual place, with the cause of each
  refusal of the branch check.
- `branch_not_found` names the branch that the create asked for, and its
  one action is Start from and the default branch.
  `NewWorkspaceModel.startFromDefaultBranch` puts the control back on the
  default branch, and the refusal goes. The message stays, and the message
  field takes the focus, so Enter sends.
- `github_access_required` names the repository, and Try again sends the
  same message again.
- Every other failure, such as `invalid_input`, keeps the notice of a failed
  create with Try again.

## Tests

- `branch-rows.test.ts` checks the order, the check mark, the search, and
  each state of the list.
- `branch-lists.test.ts` checks the load of each read, the newest answer,
  and the load after a failure. `app-model.test.ts` checks that another
  person gets no list of the person before.
- `new-workspace-branch.test.ts` checks the fields of each create, the kept
  target, the end of the branch at a change of repository and at a send,
  and Start from main.
- `../shell/new-workspace/BranchPicker.test.tsx` checks the picker on the
  page, in the dialog, and on a phone, the keys, the target choice, the
  create, and both refusals.

## Development

- The dev fake lists the branches of the mockups for acme/storefront, and
  only the default branch for the other repositories.
  [The development fake](dev-fake.md) gives the options `?branches=` and
  `?branchCheck=`, which show the other states of the list and the
  refusals.
