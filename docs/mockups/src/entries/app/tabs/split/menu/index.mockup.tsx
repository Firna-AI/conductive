import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const splitMenu = defineScreen({
  title: 'Tab menu with two panes',
  description:
    'The split of the A session beside a file page is open, and the left pane has the focus. A right click on the Address autocomplete tab opens its menu: Rename session, a line, Copy link, Copy concise transcript, and Copy full transcript, a line, Move left, Move right, and Move to the other pane, a line, then Close tabs to the right. Move to the other pane moves the tab to the end of the right row, after useAddressAutocomplete.ts, and shows it there. The right pane then has the focus, and the left pane shows Debounce the address lookups to 250 ms, the tab after it. Shift+F10 and the Menu key on the focused tab open the same menu. With one pane, the item reads Open in a new pane, as the Tab menu page shows. On a phone, a long press that ends without a move opens the menu as a sheet, and Move to the other pane is off there, because a phone shows one row. The right pane holds only a file, so the phone row holds only the two sessions of the left pane.',
  rationale:
    'Split panes decision 4 B, which the user chose on 16 November 2026: one item in the group of Move left and Move right gives a keyboard user each result of a drop. With two panes, it reads Move to the other pane. With one pane, it reads Open in a new pane and opens the second pane on the right, so a user gets a left pane only by moving the other tabs. The item is off when the pane holds only this tab and no other pane exists, as the One tab in one pane page shows. A phone shows one row and opens no second pane, so the item is off there, greyed, as each item that the place of a tab rules out. A read-only workspace leaves the item out (decision 214). As each move to the other pane does, the move shows the tab in its new pane, which takes the focus, and a screen reader hears the tab, its new pane, and its place, such as "Address autocomplete moves to the right pane, place 2 of 2". A design call of 16 November 2026 puts the tab at the end of the row of the other pane, as a drop on the content of that pane does. A design call of the same day for the mockups gives the item the icon of two columns, so it differs from the icon of the right column.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    panes: 'file',
    rightColumn: 'hidden',
    overlay: 'tab-menu',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'only-tab',
      title: 'One tab in one pane',
      description:
        'Saved carts has one session, so its one pane holds only that tab. A right click on the tab opens its menu, and Open in a new pane is off, as Move left, Move right, and Close tabs to the right are. A new pane with the only tab would leave no tab in the first pane, so the column would not change. When the pane holds a second tab, the item is on, as the Tab menu page shows. On a phone, the sheet has the same items, and the item is off there too.',
      rationale:
        'Split panes decision 4 B, which the user chose on 16 November 2026: the item is off when the pane holds only this tab and no other pane exists. A design call of 13 November 2026 shows no mark for the same drop on a half of the content, so the menu and the drag agree: each action that changes nothing is off. The item keeps its place, greyed, as each item that the place of a tab rules out (decision 188).',
      props: {
        workspace: 'saved-carts',
        conversation: 'first-turn',
        banner: 'no-commits',
        panes: 'one',
        rightColumn: 'shown',
      },
    },
  ],
})
