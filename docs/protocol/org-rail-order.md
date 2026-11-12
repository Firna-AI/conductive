# Org rail order

This doc holds the requirements and the decisions in force for the order
of the orgs in the org rail. Each person keeps their own order. It covers
the drag, the tile menu, the keys, the long press on a phone, and the
places that use the order. It belongs to
[Orgs and members](orgs-and-members.md), which covers orgs, their
sections, and their members. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue.md) draws the order at
`app/orgs/reorder`, on desktop and on a phone.

## Terms

- **Org rail:** the narrow column at the far left of the app. It shows a
  tile for each org of the person, then Create org. The account sits at
  its foot. An operator also sees Operator above the account.
- **Tile:** the item of one org in the rail. It shows the initials of the
  org.
- **Tile menu:** the menu of one tile, with Move up and Move down.
- **Org switcher:** the sheet of a phone that lists the orgs, Create org,
  and the account. A phone has no rail.

## The order

- Each person has their own order of the orgs in the org rail
  (decision 515 C). A move changes the rail of no other person.
- The order stays after a reload. The other devices of the person and the
  Mac app load the same order.
- An order that each browser keeps was rejected, because each browser and
  the Mac app would then keep their own order. A list in Account settings
  was rejected, because people may not find a control away from the rail.
- An automatic order, such as the last opened org first, was rejected,
  because the person cannot choose it. Pins were rejected, because they
  give only two groups. Folders of orgs were rejected, because they group
  the orgs and still need an order inside each folder.
- An org that the person creates or joins goes at the end of the rail.
  Reason: a new tab also opens at the end of the tab row, as
  [The tab row](agents-and-sessions.md#the-tab-row) says.
- Create org, Operator, and the account have no tile menu and do not move.

## Where the order shows

- The org switcher shows the orgs in this order.
- The Switch to rows of the command palette show the orgs in this order,
  as [Actions](command-palette-actions.md#actions) says.
- Each place that picks the first org of the person uses this order. The
  org that the address `/` opens is one such place. The org of the palette
  on a page without an org is another, as
  [The org of the palette](command-palette.md#the-org-of-the-palette)
  says.

## Drag

- The person can drag a tile to another place in the rail.
- A drag does not open the org. A click without a move still opens it.
- Escape cancels a drag and keeps the order.
- The rail shows no name of an org during a drag. Reason: a name shows on
  hover and on focus. During a drag, it would name the tile under the
  pointer, not the drop place.
- A drag alone was rejected, because a keyboard or screen reader user
  cannot drag. The tile menu and the keys give them each move.

## The tile menu

- A right click on a tile opens its tile menu at the pointer. The tile menu
  replaces the menu that the browser shows for a link.
- On a focused tile, Shift and F10, or the Menu key, also opens the tile
  menu. This holds on every system.
- The keys open the tile menu beside the tile, at its right. Reason: the
  rail is a narrow column at the left edge of the window. A menu below the
  tile, as on a workspace row, would cover the tiles that a move passes.
- The tile menu does not open the org.
- The tile menu holds Move up and Move down. Each item moves the tile one
  place.
- On the first tile, Move up is off. On the last tile, Move down is off.
- After a move from the tile menu, a screen reader user hears the name of
  the org and its new place, such as "Firna moves to place 1 of 3". The
  focus then goes back to the tile.
- Move to top and Move to bottom were rejected, because the tile menu would
  then differ from the tab menu.

## Keys

- Alt and Up or Down, with no other modifier key, move a focused tile one
  place, as on a workspace row (decision 517 B).
- A screen reader user hears the same message as after a move from the tile
  menu. The focus stays on the tile.
- Reason: the rail and the workspace list are both vertical lists, so the
  same keys move an item in both.
- Alt with Left or Right was rejected, because the rail is vertical, and
  these keys go Back and Forward in browsers.
- A drag by keys, with Space to lift and drop the tile, was rejected. No
  other list of the app works that way. A screen reader in browse mode also
  takes the plain arrow keys.
- A palette action that moves an org was rejected, because it must first
  name the org. So it is slower than the tile menu.

## On a phone

- On a phone, a long press on an org in the org switcher lifts it. The
  finger then moves it to a new place.
- The long press opens no menu, also when it ends without a move.
- Reason: the org switcher is already a sheet. A long press on a workspace
  row also only lifts the row.

## A suspended or deleted org

- A suspended org moves like any other org (decision 516 A).
- A deleted org has no tile to move. Its admins restore it from Account
  settings, as [Delete org](orgs-and-members.md#delete-org) says.
- Reason: the rail order belongs to the person and spans their orgs, so a
  move is not a change in the org. Other members see no change.
  [What members of a suspended org keep](operator-actions.md#what-members-of-a-suspended-org-keep)
  states this rule.
- A tile that does not move was rejected for such an org, because it looks
  like the other tiles and would refuse a move with no visible reason.
- A place at the end of the rail for such an org was rejected, because its
  tile would then move without an action of the person.

## Saving a move

- A move shows at once. When its save fails, only that move goes back, and
  a toast names the failure, as for a failed move of a workspace row.
- Two moves that overlap, such as from two devices, give the order of the
  two moves one after the other.
- The server accepts a move only for an org that the person sees in the
  rail. A move of another org gets HTTP 404 with the code `org_not_found`.
