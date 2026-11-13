# The design of New workspace

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the parts that the screens share. This page
gives the branch control of New workspace, its picker, the target choice of
a picked branch, and the refusals of the branch check, from decisions 288
to 295. The design gives the rest of the New workspace page and of the New
workspace dialog.

- `BranchPicker.tsx` in `src/components/new-workspace/` draws the branch
  control beside the repository picker, on the page and in the dialog. The
  control shows the default branch until the member picks another branch.
  It shows the branch icon, the name, and a chevron, and a long name ends
  in an ellipsis. The page uses the default tone, and the dialog the plain
  tone, as for the repository picker. On a phone the control goes under the
  repository picker when the two do not fit on one line, and it can take
  the whole width of that line.
- The open picker hangs below the control on a computer, in the box of a
  menu. A phone opens it as a sheet with the title Branch and rows of touch
  size. A search field stands at the top. The default branch comes first,
  with the muted detail `default`, then the other branches, newest commit
  first, each with the time since its newest commit. The rows take the look
  of the rows of `Menu.module.css`, and a check marks the branch of the
  form. A search keeps each row whose name holds the query, and it
  highlights the first row, which Enter picks.
- The default branch needs no read of GitHub, so its row shows in each
  state of the list. Under it, a line says that the list loads, or that
  nothing matches the search. A read of GitHub that failed shows a notice
  with Try again. A GitHub account that cannot read the repository shows a
  notice that says so, without an action.
- The control always names a branch, so it has no Clear. A pick of the
  default branch hides the target choice.
- `TargetChoice.tsx` beside it draws the choice of two targets. It shows
  only when the picked branch is not the default branch. The first option,
  "Target" and the picked branch, is selected first. The second is
  "Target" and the default branch. A line under the choice says what the
  pull request then holds.
- A computer shows the choice as a Firna segmented control, whose options
  take the width of their words, up to 320 px. A longer name ends in an
  ellipsis, so the two options still fit in the dialog. A phone shows two
  Firna radio cards, one above the other, because two branch names do not
  fit side by side, and a long name wraps. On the page the choice stands
  under the pickers. In the dialog it has a line of its own under the
  header, and its line follows it when the two fit side by side.
- `CreateRefusedNotice` in `notices.tsx` draws a create that the branch
  check refused, in the place of a failed create and with its title. A
  missing branch offers Start from and the default branch, which puts the
  control back on that branch and keeps the message. A GitHub account that
  cannot read the repository gets Try again.
- `branchCopy.ts` holds the words of the control, of the picker, of the
  target choice, and of the refusals. It imports no fixture, and neither do
  the two parts, so the app can share them. No word says "fork", because on
  GitHub a fork is a copy of the repository.
- [The pull request bar](design-bar.md) gives the line under the bar after
  GitHub deleted the stored base of a workspace.
