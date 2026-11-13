# The tab row and split panes

These pages are part of [the mockup catalogue](catalogue.md).
[The design of the workspace](design-workspace.md) gives the parts that
they draw.

`app/tabs` draws the tab row of the centre column of Checkout address
autocomplete, `W-395`, from decisions 186 to 188. Its canonical screen has
a drag of useAddressAutocomplete.ts between the two sessions. Its child
pages kept the paths that they had as its saved states:

- `app/tabs/moved` has the row after the move, with a new session at its
  end.
- `app/tabs/full` has a row with more tabs than fit, scrolled to the shown
  tab.
- `app/tabs/menu` has the tab menu of a session tab.
- `app/tabs/rename` has the rename field in a tab that does not show.

`app/tabs/split` draws split panes in the centre column, from split panes
decisions 1 C, 2 A, and 3 B, which the user chose on 13 November 2026. Each
pane has its own tab row and its own +, and at most two panes stand side by
side. Its canonical screen has Debounce the address lookups to 250 ms in
the right pane, beside Address autocomplete and useAddressAutocomplete.ts
in the left pane. The right pane has the focus, so its shown tab carries
the mark of the focus. On a phone, one row holds the session tabs of both
panes. The two-pane screens hide the right column, so that two panes fit
the frame of the catalogue. With the default panels, a window needs at
least 1363 px for two panes beside the right column. Its child pages:

- `app/tabs/split/file` has both sessions in the left pane, which has the
  focus, beside the kept file useAddressAutocomplete.ts in the right pane.
  Its `resize` variant has a drag of the divider that gives the chat 40% of
  the column, with the grip of the divider in its middle.
- `app/tabs/split/drag` has a drag of Debounce the address lookups to 250 ms
  over the right half of the content of one pane, with the drop mark over
  that half. Its `left` variant has a drag of useAddressAutocomplete.ts over
  the left half. Its `pane` variant has the two panes open and a drag of
  useAddressAutocomplete.ts over the content of the right pane, with the
  drop mark over the whole pane. Its `row` variant has the same tab over the
  right row, with the line of the drop before its first tab. On a phone,
  the long press moves a tab in the one row only, also across the border of
  the two parts.
- `app/tabs/split/narrow` has the split of the canonical screen in a centre
  column narrower than two panes of 320 px: one row with the tabs of both
  panes, and the shown tab of the focused pane. Its `file` variant has the
  split of `app/tabs/split/file` in the same column.
- `app/tabs/split/archived` has the saved split of an archived workspace,
  with no + and no drag, and one archived bar under both panes.

The control of split panes decision 4, a split without a drag, and the
temporary tab of split panes decision 5 wait for the choice of the user.
So no screen of `app/tabs/split` shows a temporary tab or a new item of the
tab menu.

The `panes` control of the workspace screen chooses the split, as
`paneStates` in `src/screens/chatStates.ts` says.
