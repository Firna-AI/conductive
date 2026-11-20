import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesMenu = defineScreen({
  title: 'Row menu',
  description:
    'A right click on AddressForm.tsx in All files opens its menu at the pointer: Add to chat, a line, then Copy path. The row keeps the fill of a hover, as a tab with an open menu does, and Address autocomplete stays the shown tab. Add to chat puts the chip of the file in the message field of the session tab that Cal saw last, and shows that tab. Copy path copies src/app/checkout/AddressForm.tsx, the path from the root of the repository, and a toast says "Path copied". Shift+F10 or the Menu key on a focused row opens the same menu below the row. Escape, Tab, or a press outside closes it, and the focus goes back to the row. A click with a modifier key, or a middle click, still opens the file in a new browser tab. On a phone, a long press on the row that ends with no move opens the menu as a sheet, with the name of the row as its title. The child pages show the menu of a folder and of a row of Changes, the toast after Copy path, the menu while the cloud computer is stopped, the chat after Add to chat, and the tab menu of a file in a read-only workspace.',
  rationale:
    'On 16 November 2026 the user asked for a right-click menu on the rows of All files and Changes, with Copy path, because the menu of the browser copies the address of the app, not the path. The user chose Copy path and Add to chat on the same day, as decision 1 of the file row menu change. A design call of that day puts them in two groups, Add to chat, a line, then Copy path, because the tab menu groups its items by kind (decision 188), and an action comes before a copy item, as Rename session comes before Copy link. Another design call of that day copies the path from the root of the repository, with no ./, no final /, and no quotes, because the terminal and both agents start in the repository folder (decision 94). The menu opens in the ways that the tab menu opens, and no row has a button for it. A row whose label hides a secret value opens no menu, so the browser shows its own, as the user chose with decision 2 A. Add to chat has the icon of the @ of a mention, because the speech bubble with a plus names New session. The other states of the page are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
    rowMenu: 'file',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
