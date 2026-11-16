import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const tabsMenu = defineScreen({
  title: 'Tab menu',
  description:
    'A right click on the Address autocomplete tab opens its menu: Rename session, a line, Copy link, Copy concise transcript, and Copy full transcript, a line, Move left, Move right, and Open in a new pane, a line, then Close tabs to the right. Copy link copies the link of the session, and a toast says “Link copied”. It is the first tab, so Move left is off. Open in a new pane opens the second pane on the right with the tab, as a drop on the right half of the chat does. Close tabs to the right closes every tab after it, as in a browser, and it is off on the last tab. The menu of a kept file or diff tab has Move left, Move right, and Open in a new pane, then Close tabs to the right. On a phone, a long press that ends without a move opens the same menu as a sheet, and Open in a new pane is off there, because a phone shows one pane. The Copy a transcript page shows the toast after a copy, and the menu of an archived workspace. The Temporary tab page shows the menu of the temporary tab, which leads with Keep open. The Tab menu with two panes page shows Move to the other pane.',
  rationale:
    "The user chose option G of decision 188 on 9 November 2026: a right click on a tab opens a menu with a move and a rename, in the style of Conductor's tab menu, with flat rows in groups and a line between the groups. Move left and Move right move the tab one place, for a user who does not drag. An item that the place of the tab rules out keeps its place, greyed. The user also removed the Rename button of the shown session tab, so the menu is the one way to rename a session. The user chose option B of decision 215 on 9 November 2026: two copy items, as Conductor has, in their own group between the rename and the moves. Copy concise transcript copies the chat as it shows at first, with each fold closed, and Copy full transcript copies it with every fold open. The user chose option B of decision 214 on the same day: in a read-only workspace, the menu of a session tab holds only the copy items, and a file or diff tab opens no menu. On 12 November 2026 the user asked for Copy link in the menu of a session tab. It leads the copy group and copies the link of the session, which opens its workspace with that session shown. On 16 November 2026 the user asked for Close tabs to the right, as Chrome has it. It ends the menu of every tab, in its own group. When the shown tab is among the closed tabs, the tab of the menu shows first. Running sessions among them share one question before they close. Split panes decision 4 B, which the user chose on 16 November 2026: one item in the group of Move left and Move right reads Open in a new pane with one pane, and Move to the other pane with two, so a keyboard user can split without a drag. It is off when the pane holds only this tab, and on a phone.",
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    tab: 'new-session',
    tabRow: 'opened',
    overlay: 'tab-menu',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
