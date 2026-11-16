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
- `app/tabs/menu` has the tab menu of a session tab, with Open in a new
  pane in the group of Move left and Move right.
- `app/tabs/rename` has the rename field in a tab that does not show.

`app/tabs/split` draws split panes in the centre column, from split panes
decisions 1 C, 2 A, and 3 B, which the user chose on 13 November 2026, and
split panes decisions 4 B, 5 B, and 6 G, which the user chose on
16 November 2026. Each pane has its own tab row and its own +, and at most
two panes stand side by side. Its canonical screen has Debounce the address
lookups to 250 ms in the right pane, beside Address autocomplete and
useAddressAutocomplete.ts in the left pane. The right pane has the focus,
so its shown tab carries the mark of the focus. On a phone, one row holds
the session tabs of both panes. On desktop the split never turns into one
row. The right column gives way first, down to 280 px, so that each pane
keeps 320 px, and then both panes shrink with the window. Most of its
screens hide the right column, so that each pane has more room in the
frame of the catalogue. Its child pages:

- `app/tabs/split/file` has both sessions in the left pane, which has the
  focus, beside the kept file useAddressAutocomplete.ts in the right pane.
  Its `resize` variant has a drag of the divider that gives the chat 40% of
  the column, with the grip of the divider in its middle.
- `app/tabs/split/temporary` has a temporary tab in each pane: README.md in
  the left row, and the diff of AddressForm.tsx in the right row, which has
  the focus. Both titles show in italics. Its `replaced` variant has a
  press on useAddressAutocomplete.ts, which replaces the diff in the
  temporary tab of the right pane, while README.md stays in the left row.
  On a phone, the chat shows the session of the left pane, because the
  focused pane shows a file.
- `app/tabs/split/drag` has a drag of Debounce the address lookups to 250 ms
  over the right half of the content of one pane, with the drop mark over
  that half. Its `left` variant has a drag of useAddressAutocomplete.ts over
  the left half. Its `pane` variant has the two panes open and a drag of
  useAddressAutocomplete.ts over the content of the right pane, with the
  drop mark over the whole pane. Its `row` variant has the same tab over the
  right row, with the line of the drop before its first tab. On a phone,
  the long press moves a tab in the one row only, also across the border of
  the two parts.
- `app/tabs/split/menu` has the tab menu of Address autocomplete in the
  left pane of the split of `app/tabs/split/file`, with Move to the other
  pane after Move left and Move right. On a phone, the item is off. Its
  `only-tab` variant has the menu of the only tab of one pane, where Open
  in a new pane is off.
- `app/tabs/split/narrow` has the split of the canonical screen beside the
  right column. In a window of 1280 px, the right column narrows to 358 px,
  and each pane keeps 320 px. In a window narrower than 1179 px, both panes
  shrink, and a pane narrower than 360 px gives its chat the paddings of a
  phone. The catalogue draws the desktop view at the width of its frame,
  so the frame shows the narrowest case. Its `file` variant has the split
  of `app/tabs/split/file` in the same window.
- `app/tabs/split/archived` has the saved split of an archived workspace,
  with no + and no drag, and one archived bar under both panes.

The `panes` control of the workspace screen chooses the split, as
`paneStates` in `src/screens/chatStates.ts` says.
