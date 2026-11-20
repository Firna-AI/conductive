# The catalogue: New workspace

This page belongs to [the catalogue](catalogue.md), which lists each path
of the catalogue, the rules of its folder pages, and the entries that
moved. This page gives `app/new-workspace/start-branch`, a start from a
branch that is not the default branch, and its child pages. The catalogue
gives the other pages of `app/new-workspace`.

`app/new-workspace/start-branch` draws the start from another branch of
decisions 298 to 305, which Cal chose on 13 November 2026, with the branch
control of decision 309, which Cal chose on 20 November 2026. Its canonical
screen has the New workspace page of Acme, with the branch control directly
right of the repository picker, set to main. Each page and each dialog of
New workspace shows the control in the same place, in the look and at the
size of the repository picker. The dropdown of the control has two parts:
Start from, with the search and the list of branches, and Target, with the
two targets of a picked branch and the line about the pull request. While
a picked branch targets main, the closed control adds `→ main`. A long name
ends in an ellipsis at its end, the rule of the header before decision 309,
because Cal has not chosen yet how a long name gives way. The mockups draw
Cal, who starts Saved carts from calummoore/checkout-autocomplete, the
branch of Checkout address autocomplete, whose pull request #482 waits for
its merge. Its child pages:

- `app/new-workspace/start-branch/picker` has the open dropdown on main:
  Start from, the search field, main first, then the other branches of
  acme/storefront by their newest commit. main offers no target, so no
  Target part shows. A phone opens the dropdown as a sheet. Its `search`
  variant has a search for checkout, which keeps two branches. Its
  `no-match` variant has a search without a match. Its `loading` variant
  has the list while it loads, and its `failed` variant has a read of
  GitHub that failed, with Try again. main shows in each state.
- `app/new-workspace/start-branch/no-access` has the dropdown of Priya,
  whose GitHub account cannot read acme/storefront. Its `refused` variant
  has the refusal of a create from a picked branch for that cause, with Try
  again.
- `app/new-workspace/start-branch/target-choice` has the dropdown on the
  picked branch, with its Target part: calummoore/checkout-autocomplete,
  which is checked first, and main, with the line about the pull request.
  When the dropdown runs out of room, the list scrolls, and the Target part
  stays in view. Its `default` variant has the check on main, and the
  control names `→ main`. Its `picked` variant has the closed control with
  the picked branch alone, and its `target-main` variant has the closed
  control with `→ main`. A phone shows the same parts in the sheet.
- `app/new-workspace/start-branch/missing` has the refusal of a picked
  branch that is no longer on GitHub, with Start from main. The message
  stays. Its child page `missing/dialog` has the same refusal in the
  dialog. It was the `missing` variant of the dialog before decision 309.
- `app/new-workspace/start-branch/dialog` has the dialog with the branch
  control set to main. Its `open` variant has the open dropdown on main.
  Its `picked` variant has the closed control with the picked branch, its
  `target` variant has the dropdown with its Target part, and its
  `target-main` variant has the closed control with `→ main`, in place of
  the `target-default` variant before decision 309. A phone always opens
  the page, so each phone view shows the page in the same state.
- `app/new-workspace/start-branch/stacked` has Saved carts after a start
  that stacks on calummoore/checkout-autocomplete, and its pull request bar
  names that base. Its `create-pr` variant has changed files that are not
  committed, so the bar offers Create PR. On a phone the top of the Checks
  tab names the branch and that base where Create PR stands, from decision
  306, which Cal chose on 16 November 2026. The base takes a line of its
  own, so both names show in full. Its `base-moved` variant has the bar of
  decision 304: GitHub deleted that branch, so the base moved to main, and
  a line under the bar says so. On a phone that line stands above the
  branch and main.

The `branch`, `target`, and `branchMenu` controls of the New workspace page
and of the dialog draw these states. The `base` control of the workspace
screen draws the base of a workspace: its own, a picked branch that it
stacks on, or the default branch after GitHub deleted that branch.

Cal compared five variants of a compact branch control under
`app/new-workspace/start-branch/compact` on 16 November 2026, with the
control in the footer of the message box. Cal chose variant B, Pair, with
the control in the header (decision 309). The pages above draw it, so the
pages of the variants and their parts are gone.
