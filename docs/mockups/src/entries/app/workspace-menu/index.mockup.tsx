import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../screens/WorkspaceListScreen'

export const workspaceMenu = defineScreen({
  title: 'Workspace menu',
  description:
    'A right click on Apple Pay button opens its menu at the pointer: Move to section, Reassign to, Rename, a line, then Archive. Move to section and Reassign to open their choices beside the menu. The row keeps the fill of a hover, and its More shows pressed at its end. The menu opens no page, starts no cloud computer, and marks nothing as read. When another workspace is open, the menu still acts on the row that the user clicked. On a phone, More at the end of each row opens the same menu as a sheet. The child pages show More, each action, and the menus of other people and other rows.',
  rationale:
    "The user chose the actions of the menu on 9 November 2026: Move to section, Reassign to, Rename, and Archive. Conductive already moves, reassigns, and archives a workspace, and Rename is the one new action. Copy link and the other actions of Conductor's menu stay out. One list of actions serves the right click and More, so a touch screen and a keyboard reach the same menu. Each action keeps the rules that it has elsewhere in the app, and the menu hides each action that the person cannot use. A long press on a phone still lifts the row for a drag, so More is the way to the menu on a touch screen.",
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'workspace', palette: 'closed' },
  useCasePaths: ['user-flows/archive-from-list'],
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})
