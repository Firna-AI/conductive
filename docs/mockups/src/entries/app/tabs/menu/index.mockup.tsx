import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const tabsMenu = defineScreen({
  title: 'Tab menu',
  description:
    'A right click on the Address autocomplete tab opens its menu: Rename session, a line, Copy link, Copy concise transcript, and Copy full transcript, a line, then Move left and Move right. Copy link copies the link of the session, and a toast says “Link copied”. It is the first tab, so Move left is off. The menu of a kept file or diff tab has only Move left and Move right. On a phone, a long press that ends without a move opens the same menu as a sheet. The Copy a transcript page shows the toast after a copy, and the menu of an archived workspace. The Temporary tab page shows the menu of the temporary tab, which leads with Keep open.',
  rationale:
    "The user chose option G of decision 188 on 9 November 2026: a right click on a tab opens a menu with a move and a rename, in the style of Conductor's tab menu, with flat rows in groups and a line between the groups. Move left and Move right move the tab one place, for a user who does not drag. An item that the place of the tab rules out keeps its place, greyed. The user also removed the Rename button of the shown session tab, so the menu is the one way to rename a session. The user chose option B of decision 215 on 9 November 2026: two copy items, as Conductor has, in their own group between the rename and the moves. Copy concise transcript copies the chat as it shows at first, with each fold closed, and Copy full transcript copies it with every fold open. The user chose option B of decision 214 on the same day: in a read-only workspace, the menu of a session tab holds only the copy items, and a file or diff tab opens no menu. On 12 November 2026 the user asked for Copy link in the menu of a session tab. It leads the copy group and copies the link of the session, which opens its workspace with that session shown.",
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
