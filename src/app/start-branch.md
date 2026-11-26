# New workspace: start from a branch

This guide belongs to [Web app: data and composition](README.md). It gives
the rules of the branch control of New workspace, its dropdown with the
parts Start from and Target, and the refusals of the branch check, as the
app builds them.
[Start from a branch](../../docs/protocol/start-from-a-branch.md) states
the requirements, and the mockups under `app/new-workspace/start-branch`
draw them. The words come from the shared `branchCopy.ts`, and the
parts reuse the shared CSS modules.

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
  branch. Before a choice, the picked branch is the target (decision 305).
- `formBranch` gives what a form shows: the branch of the control, the
  default branch, and the target of a picked branch.
- A create from the default branch names no branch. A create from another
  branch sends `startBranch`, the picked branch, and `baseBranch`, the
  target: the picked branch, or the name of the default branch, which the
  Worker stores as a null base. `branchFields` gives the two fields.
- A failed create keeps the repository and the start branch of its
  request in `CreateState`, so a refusal names them also after a change
  of the form.

## The control and its dropdown

- `BranchControl` in `../shell/new-workspace/BranchPicker.tsx` stands
  directly right of the repository picker on the page and in the header of
  the dialog, with the look and the size of that picker (decision 309). It
  always names a branch.
- While a picked branch targets the default branch, a muted `→ main`
  follows the name, before the chevron, and the spoken name adds the
  target, such as "Branch: feature-x, target main". A target on the picked
  branch adds nothing, because the work then stacks on the branch that the
  control names.
- A long name ends in an ellipsis, and `→ main` and the chevron stay in
  view. The limit of the control grows from 280 px to 340 px while it
  shows `→ main`, so a name gives way at about the same length. On a phone
  the control may take the whole width of its line, and the `min-width: 0`
  of `.start` in `NewWorkspaceScreen.module.css` keeps the start of the
  page inside the screen.
- A press opens the dropdown, which reads the branches of the repository
  again, live. `OrgModel.branches` holds the list of each repository, in
  `branch-lists.ts`. While a read runs, the list loads, also for Try again
  after a failure. Only the answer of the newest read shows.
- `BranchMenu` in `../shell/new-workspace/BranchMenu.tsx` draws the open
  dropdown in two parts, with the CSS of the shared
  `BranchMenu.module.css`: Start from, then Target for a picked branch
  that is not the default branch. The label Start from shows also without
  Target.
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
- `BranchList` in `../shell/new-workspace/BranchList.tsx` draws Start
  from. The search field keeps the focus, as the combobox of the rows. A
  search highlights its first match. Up and Down move the highlight with a
  wrap at each end, and Enter picks the highlighted branch. The Firna field
  keeps its key events from the elements around it, so the list hears them
  in the capture phase.
- A pick, a press of a target, Escape, and a press outside close the
  dropdown, and the focus goes back to the control. The focus on an
  element outside the control and the dropdown also closes a dropdown
  beside its control, through the option `focusOutside` of `useDismiss` in
  `../shell/ui/Overlay.tsx`. So Tab goes from the search field to Try
  again after a failed read, then to the checked target, and the dropdown
  closes as Tab leaves it. The control counts as part of the dropdown. So
  Shift+Tab from the search field moves the focus to the control and
  leaves the dropdown open, and a press of the control closes the dropdown
  at its click. A focus that goes to no element, such as to another
  window, leaves the dropdown open. The key of the command palette closes
  it, as it closes a menu.
- On a computer the dropdown hangs below the control, in the top layer of
  a `PopoverSurface`, so no box clips it. Its option `keepSide` keeps the
  dropdown below the control also when it does not fit there, where a
  menu flips to the roomier side, and limits it to the room below. When
  the room runs out, the list of branches scrolls, and the labels, the
  search field, and the Target part stay in view. A phone opens the
  dropdown as a sheet with the same parts, and the body of the sheet is
  the room.

## The Target part

- The Target part of `BranchMenu` holds the target choice of decision 301,
  on the page and in the dialog. No line of a target choice shows under
  the pickers or under the header of the dialog (decision 309).
- It has two rows: the picked branch first, then the default branch. Each
  row names only its branch, and a check marks the target of the form. The
  line under the rows says what the pull request then holds.
- The rows are the radios of the group Target. They take one stop of Tab,
  on the checked row. Up and Down move the focus between them, with a wrap,
  and choose nothing. A press of a row, or Enter or Space on it, chooses
  its target and closes the dropdown.

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
- `../shell/new-workspace/BranchPicker.test.tsx` checks Start from on the
  page: the default branch without a Target part, the search, the keys, a
  pick that closes the dropdown, and the create from the picked branch. It
  also checks both refusals.
- `../shell/new-workspace/BranchTarget.test.tsx` checks the Target part on
  the page, in the dialog, and in the sheet of a phone: the closed control
  with `→ main` and its spoken name, a press of a target that closes the
  dropdown, the kept target, the create fields, the draft that the dialog
  shares, and the clear at a change of repository. On a phone it also
  checks Try again after a failed read.
- `../shell/new-workspace/BranchPickerFocus.test.tsx` checks the focus of
  the dropdown on a computer: Tab to Try again after a failed read, the
  close as Tab leaves the dropdown, a press of the control that closes the
  open dropdown, and the keys of the Target part.
- `../shell/new-workspace/branch-test-kit.ts` holds the helpers of these
  three tests.

## Development

- The dev fake lists the branches of the mockups for acme/storefront, and
  only the default branch for the other repositories.
  [The development fake](dev-fake.md) gives the options `?branches=` and
  `?branchCheck=`, which show the other states of the list and the
  refusals.
