# The catalogue: New workspace

This page belongs to [the catalogue](catalogue.md), which lists each path
of the catalogue, the rules of its folder pages, and the entries that
moved. This page gives `app/new-workspace/start-branch`, a start from a
branch that is not the default branch, and its child pages. The catalogue
gives the other pages of `app/new-workspace`.

`app/new-workspace/start-branch` draws the start from another branch of
decisions 288 to 295, which Cal chose on 13 November 2026. Its canonical
screen has the New workspace page of Acme, with the branch control beside
the repository picker, set to main. Each page and each dialog of New
workspace shows the control in the same place. The mockups draw Cal, who
starts Saved carts from calummoore/checkout-autocomplete, the branch of
Checkout address autocomplete, whose pull request #482 waits for its merge.
Its child pages:

- `app/new-workspace/start-branch/picker` has the open picker: the search
  field, main first, then the other branches of acme/storefront by their
  newest commit. A phone opens it as a sheet. Its `search` variant has a
  search for checkout, which keeps two branches. Its `no-match` variant has
  a search without a match. Its `loading` variant has the list while it
  loads, and its `failed` variant has a read of GitHub that failed, with
  Try again. main shows in each state.
- `app/new-workspace/start-branch/no-access` has the picker of Priya, whose
  GitHub account cannot read acme/storefront. Its `refused` variant has the
  refusal of a create from a picked branch for that cause, with Try again.
- `app/new-workspace/start-branch/target-choice` has the picked branch with
  the target choice: Target calummoore/checkout-autocomplete, which is
  selected first, and Target main. Its `default` variant has Target main
  selected. A phone shows the two targets as radio cards.
- `app/new-workspace/start-branch/missing` has the refusal of a picked
  branch that is no longer on GitHub, with Start from main. The message
  stays.
- `app/new-workspace/start-branch/dialog` has the dialog with the branch
  control set to main. Its `open` variant has the open picker. Its `target`
  and `target-default` variants have the target choice on each of its
  values, and its `missing` variant has the refusal of a missing branch. A
  phone always opens the page, so each phone view shows the page in the
  same state.
- `app/new-workspace/start-branch/stacked` has Saved carts after a start
  that stacks on calummoore/checkout-autocomplete, and its pull request bar
  names that base. Its `base-moved` variant has the bar of decision 294:
  GitHub deleted that branch, so the base moved to main, and a line under
  the bar says so.

The `branch`, `target`, and `branchMenu` controls of the New workspace page
and of the dialog draw these states. The `base` control of the workspace
screen draws the base of a workspace: its own, a picked branch that it
stacks on, or the default branch after GitHub deleted that branch.
