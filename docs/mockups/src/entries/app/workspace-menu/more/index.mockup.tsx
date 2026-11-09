import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const workspaceMenuMore = defineScreen({
  title: 'Open from More',
  description:
    'More sits at the end of a row, beside its link, in the place of the time. It shows under the pointer, on the row with the focus, on the current row, and while the menu is open. More of Apple Pay button opens the menu below itself. Shift+F10 or the Menu key on a focused row opens the same menu below the row. A phone shows More on every row, after the time, and opens the menu as a sheet.',
  rationale:
    'A visible More gives a touch screen and a keyboard the menu of a right click, as the More of a section does. More is a control of its own beside the link of the row, so a click with a modifier key still opens the workspace in a new tab, and a drag still lifts the row. A row with no action for the person shows no More.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'workspace-more', palette: 'closed' },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})
