import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const reorderOrgs = defineScreen({
  title: 'Reorder orgs',
  description:
    'Cal drags Firna from the bottom of the rail to the top. The tile lifts under the pointer as a raised card, a faint copy stays where it was, and a line above Acme shows where it lands. The rail names no org during the drag. Acme stays open, because a drag opens no org, and a click without a move still opens the org. Escape ends the drag, and the order stays as it was. On a phone, which has no rail, a long press lifts Firna in the org switcher, and the finger moves it to the top in the same way.',
  rationale:
    'The user chose option C of decision 515 on 11 November 2026: each person keeps their own order of their orgs, and the server saves it with their memberships, so the order is the same on every device and in the Mac app. The person changes it on the rail by a drag or by the tile menu, and on a phone by a long press in the org switcher. The drag looks like the drag of a tab and of a workspace row, so every drag in the app looks the same. The line takes no space, so no tile moves during the drag. A design call of the same day hides the names of the orgs during the drag: a name shows on hover, so it would name the tile under the pointer, not the dragged org.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'orgs',
    palette: 'closed',
    orgOrder: 'drag',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'moved',
      title: 'After the move',
      description:
        'The rail after the drop: Firna, Acme, then Futex. Acme stays open. The org switcher of a phone shows the orgs in the same order, and so do the org rows of the command palette. Firna is now the top org that is not deleted, so the address / opens Firna. A new org, such as one that Create org makes, goes at the end of the rail.',
      rationale:
        'Decision 515 C keeps the order on the memberships of the person, so it stays after a reload, on each device, and in the Mac app. Other members see no change. The org switcher and the command palette read the same list as the rail. Two design calls of 11 November 2026 apply. A new org goes at the end of the rail, because the app already adds a created or accepted org at the end, and a new tab opens at the end of the tab row. Each place that picks the first org that is not deleted, such as the address / and Get started, now picks the top such org of the rail.',
      props: { orgOrder: 'moved' },
    },
    {
      slug: 'menu',
      title: 'Tile menu',
      description:
        'A right click on Firna, the first tile, opens its menu at the pointer: Move up and Move down. Firna is at the top, so Move up is off, and on the last tile Move down is off. Each item moves the tile one place. Then a screen reader hears the org name and its new place, and the focus goes back to the tile. Shift+F10 or the Menu key on a focused tile opens the same menu beside the tile. Alt and Up or Down, with no other modifier, also move a focused tile one place, and the focus stays on it. The menu opens no org, so Acme stays open. Create org, Operator, and the account have no menu. A phone has no tile menu, so its view is the org switcher in the same order.',
      rationale:
        "Decision 515 C gives the rail a tile menu with Move up and Move down for a person who does not drag, as the tab menu has Move left and Move right. The menu takes the place of the browser's menu of a link on a tile. A move that the place of the tile rules out keeps its place, greyed, as in the tab menu. The user chose option B of decision 517 on 11 November 2026: Alt and Up or Down also move a focused tile, as on a workspace row, so both vertical lists of the app move an item with the same keys. Two design calls of 11 November 2026 apply. The keys open the menu beside the tile, where the name of a tile shows, because a menu below the tile would cover the tiles that a move passes. A phone opens no menu, because the org switcher is already a sheet, and a long press on a workspace row also only lifts it.",
      props: { orgOrder: 'menu' },
    },
    {
      slug: 'long-press',
      title: 'Long press on a phone',
      description:
        'On a phone, a long press on Futex in the org switcher lifts it. The row rises as a raised card under the finger, a faint copy stays at its place, and the line marks its place until the finger moves. Then the line follows the finger, and the release drops Futex at the line. A long press that ends without a move puts Futex back at its place and opens no menu. On desktop, a drag lifts a tile in the same way: until the pointer reaches another place, the line marks the place of the tile, and a drop there changes nothing.',
      rationale:
        'Decision 515 C lets a phone, which has no rail, reorder the orgs in the org switcher by a long press, as a long press lifts a tab and a workspace row. A design call of 11 November 2026 says that the long press only lifts the org and opens no menu, also when it ends without a move, because the org switcher is already a sheet, and a long press on a workspace row also only lifts it. The phone saves the same order as the rail, so the rail of every other device shows the move.',
      props: { orgOrder: 'long-press' },
    },
    {
      slug: 'suspended',
      title: 'A suspended org',
      description:
        'Acme after the operator suspended it. Its notice says that its workspaces and settings are read-only, and its tile still moves like any tile. A right click on the tile of Acme opens the same menu. Acme sits between Firna and Futex, so both items are on. On a phone, a long press lifts Acme in the org switcher, and the finger moves it like any org. The faded tile of a deleted org, which its admins still see, moves in the same way.',
      rationale:
        'Decision 515 C gives each org tile the drag and the tile menu. The user chose option A of decision 516 on 11 November 2026: every tile moves, also the tile of a suspended or deleted org. The order of the rail belongs to the person and is not a change in the org, so the rule that nothing in a suspended org can change does not cover it, and other members see no change. The tile of a suspended org looks the same as before, so it also acts the same. The tab order and the read marks of a suspended org stay as they are, because each of them belongs to one org, while the rail order spans the orgs of the person.',
      props: { list: 'suspended', orgOrder: 'current' },
    },
  ],
})
