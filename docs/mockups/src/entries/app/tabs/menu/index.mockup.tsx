import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const tabsMenu = defineScreen({
  title: 'Tab menu',
  description:
    'A right click on the Address autocomplete tab opens its menu: Rename session, a line, Find, Copy link, Copy concise transcript, and Copy full transcript, a line, Move left and Move right, a line, then Close tabs to the right. Find shows that tab and opens the find bar on it, with the focus in its field. Copy link copies the link of the session, and a toast says “Link copied”. It is the first tab, so Move left is off. Close tabs to the right closes every tab after it, as in a browser, and it is off on the last tab. On a phone, a long press that ends without a move opens the same menu as a sheet, so Find opens the bar on a phone too. The menu of a file or diff tab and the menu of a read-only workspace are variants. The Copy a transcript page shows the toast after a copy, and the menu of an archived workspace. The Temporary tab page shows its menu, which leads with Keep open.',
  rationale:
    "The user chose option G of decision 188 on 9 November 2026: a right click on a tab opens a menu with a move and a rename, in the style of Conductor's tab menu, with flat rows in groups and a line between the groups. Move left and Move right move the tab one place, for a user who does not drag. An item that the place of the tab rules out keeps its place, greyed. The user also removed the Rename button of the shown session tab, so the menu is the one way to rename a session. The user chose option B of decision 215 on 9 November 2026: two copy items, as Conductor has, in their own group between the rename and the moves. Copy concise transcript copies the chat as it shows at first, with each fold closed, and Copy full transcript copies it with every fold open. The user chose option B of decision 214 on the same day: a read-only workspace leaves out each item that changes the workspace. On 12 November 2026 the user asked for Copy link in the menu of a session tab. It copies the link of the session, which opens its workspace with that session shown. On 13 November 2026 the user chose B of find decision 1, which adds Find to the menu of each tab. A design call of the same day puts Find first in the second group, before Copy link, because it changes nothing, as the copy items do. On 16 November 2026 the user asked for Close tabs to the right, as Chrome has it. It ends the menu of every tab, in its own group. When the shown tab is among the closed tabs, the tab of the menu shows first. Running sessions among them share one question before they close. This page moved here from a saved state of the Move tabs page, with the same path.",
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
  variants: [
    {
      slug: 'file',
      title: 'File tab menu',
      description:
        'A right click on the useAddressAutocomplete.ts tab, the shown tab, opens its menu: Find, a line, Move left and Move right, a line, then Close tabs to the right. Find opens the find bar over the code. It is the last tab, so Move right and Close tabs to the right are off. The menu of a diff tab is the same. A phone shows no file tab, so it has no file tab menu: the file is a page of the Files tab, and Find in the header of that page opens the bar.',
      rationale:
        'A design call of 13 November 2026, under find decision 1 B: in the menu of a file or diff tab, Find is its own group before Move left and Move right, because it changes nothing and the moves change the row. The Find button of the page header gives the same command, so a phone, which has no tab row for files, still opens the bar.',
      props: { tab: 'code', focus: 'files', overlay: 'file-tab-menu' },
    },
    {
      slug: 'read-only',
      title: 'Read-only file tab menu',
      description:
        'Acme is suspended, so its workspaces are read-only. A right click on the useAddressAutocomplete.ts tab opens its menu with only Find. Move left, Move right, and Close tabs to the right change the workspace, so the menu leaves them out. The menu of a session tab there holds Find, Copy link, Copy concise transcript, and Copy full transcript. A phone shows no file tab, so its view is the read-only chat.',
      rationale:
        'Decision 214 B of 9 November 2026: a read-only workspace leaves out each item that changes the workspace, and keeps each item that changes nothing. A design call of 13 November 2026 keeps Find there, because it changes nothing, so a file or diff tab of a read-only workspace now opens a menu with only Find.',
      props: {
        tab: 'session',
        sandbox: 'refused',
        org: 'suspended',
        overlay: 'file-tab-menu',
      },
    },
  ],
})
