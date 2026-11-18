import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../screens/WorkspaceListScreen'

export const workspaceMenu = defineScreen({
  title: 'Workspace menu',
  description:
    'A right click on Apple Pay button opens its menu at the pointer: Move to section, Reassign to, Rename, Copy link, a line, then Archive. Copy link copies the link of the workspace, and a toast says “Link copied”. Shift+F10 or the Menu key on a focused row opens the same menu below the row. Move to section and Reassign to open their choices beside the menu. The row under the pointer keeps its hover, with Archive over its time. The menu opens no page, starts no cloud computer, and marks nothing as read. When another workspace is open, the menu still acts on the row that the user clicked. On a phone layout the same right click or menu key opens the menu as a sheet. No row has a button for the menu. The child pages show each action, and the menus of other people and other rows.',
  rationale:
    "The user chose the actions of the menu on 9 November 2026: Move to section, Reassign to, Rename, and Archive. Conductive already moves, reassigns, and archives a workspace, and Rename is the one new action. On 12 November 2026 the user asked for Copy link in the menu too. It copies the link that the Copy link button of the header copies, and every row offers it, because it changes nothing. The menu is closed after the press, so a toast gives the result in the words of the header note. The other actions of Conductor's menu stay out. The user also chose on 9 November 2026 that a right click opens the menu, with no button on the row, and that Archive stays on the row as before. One list of actions serves the right click and the menu keys. Each action keeps the rules that it has elsewhere in the app, and the menu hides each action that the person cannot use. A long press on a phone still lifts the row for a drag and opens no menu.",
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'workspace', palette: 'closed' },
  useCasePaths: ['user-flows/archive-from-list'],
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})
