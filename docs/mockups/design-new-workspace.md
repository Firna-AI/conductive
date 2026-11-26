# The design of New workspace

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the parts that the screens share. This page
gives the branch control of New workspace, its dropdown with the parts
Start from and Target, and the refusals of the branch check, from decisions
298 to 305 and 309. The design gives the rest of the New workspace page and
of the New workspace dialog.

- `BranchPicker.tsx` in `src/components/new-workspace/` draws the branch
  control directly right of the repository picker, on the page and in the
  dialog (decision 309). The control takes the look and the size of the
  repository picker: an icon, the name, and a chevron, on the same action
  button. The page uses the default tone, and the dialog the plain tone, as
  for the repository picker. The control shows the default branch until the
  member picks another branch.
- While a picked branch targets the default branch, a muted `→ main`
  follows the name, before the chevron, in the muted colour of the effort
  of the model picker. The spoken name of the control then names the target
  too. The control names no target while the work targets the picked
  branch, because the work then stacks on the branch that the control names.
- A long name ends in an ellipsis at its end, and `→ main` and the chevron
  stay in view. The limit of the control is 280 px, and 340 px while it
  shows `→ main`, so a name gives way at about the same length. This is the
  rule of the header before decision 309. Cal has not chosen yet how a long
  name gives way, so it can change. On a phone the control goes under the
  repository picker when the two do not fit on one line, and it can take
  the whole width of that line. A name does not wrap, so the start of the
  page has `min-width: 0` and never grows past the screen. The name then
  gives way on a phone too.
- `BranchMenu.tsx` beside it draws the open dropdown in two parts. A
  computer hangs it below the control, in the box of a menu. A phone opens
  it as a sheet with the title Branch and rows of touch size.
- The first part, Start from, has a search field at the top. The default
  branch comes first, with the muted detail `default`, then the other
  branches, newest commit first, each with the time since its newest
  commit. The rows take the look of the rows of `Menu.module.css`, and a
  check marks the branch of the form. A search keeps each row whose name
  holds the query, and it highlights the first row, which Enter picks. A
  pick closes the dropdown.
- The default branch needs no read of GitHub, so its row shows in each
  state of the list. Under it, a line says that the list loads, or that
  nothing matches the search. A read of GitHub that failed shows a notice
  with Try again. A GitHub account that cannot read the repository shows a
  notice that says so, without an action.
- The second part, Target, shows only when the picked branch is not the
  default branch. It stands under a hairline, with its label. Its two rows
  name the picked branch, which is checked first (decision 305), and the
  default branch, with a check on the target of the form. The line under
  them says what the pull request then holds. A press on a row closes the
  dropdown on that target.
- The dropdown takes at most the room below the control, as the layer of
  the app does. On the page the control sits just below the middle of the
  screen, so the room is about half the screen. In the dialog the room is
  about half the screen and the part of the dialog under its header. When
  the room runs out, the list of branches scrolls, and the labels, the
  search field, and the Target part stay in view. A phone sheet does the
  same in its body.
- The control always names a branch, so it has no Clear. A pick of the
  default branch hides the Target part and `→ main`. No line of a target
  choice shows under the pickers.
- `CreateRefusedNotice` in `notices.tsx` draws a create that the branch
  check refused, in the place of a failed create and with its title. A
  missing branch offers Start from and the default branch, which puts the
  control back on that branch and keeps the message. A GitHub account that
  cannot read the repository gets Try again.
- `branchCopy.ts` in
  [`src/ui/components/new-workspace/`](../../src/ui/components/new-workspace/)
  holds the words of the control, of the two parts of the dropdown, and of
  the refusals. The app and the mockups both import these words. No word
  says "fork", because on GitHub a fork is a copy of the repository.
- [The pull request bar](design-bar.md) gives the line under the bar after
  GitHub deleted the stored base of a workspace. It also gives the branch
  and its base at the top of the Checks tab of a phone, which name a
  picked branch that a workspace stacks on.
