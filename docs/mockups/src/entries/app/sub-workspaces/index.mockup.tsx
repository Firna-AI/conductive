import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../screens/WorkspaceListScreen'

export const subWorkspaces = defineScreen({
  title: 'Sub-workspaces',
  description:
    'Checkout holds two trees. The agent of Checkout address autocomplete nested Address search API and Suggestion list under it. Under Address search API is Places API client, and under that is Rate limits, at depth 3, the deepest level. The agent of Rate limits could not nest its load test, so it made a sibling under Places API client and started its name with “Rate limits: ”. Apple Pay button has two sub-workspaces. Each level indents a row by one step, and a faint guide line runs down from under the mark of a row to the last row under it. Each top-level row comes first, then its sub-workspaces, oldest first, each followed by its own. A nested row keeps its mark, its name, its time, bold for unread output, and Archive on hover. On a phone the list page indents its taller rows by a wider step. The child pages show a parent that was archived, the drag of a tree, and the menu of a nested row.',
  rationale:
    'The user chose on 13 November 2026 that a create call can name a parent, and that the new workspace then shows under its parent in the list (sub-workspace decision 1 C). Sub-workspaces always show, so a tree has no collapse control. A collapsed section still hides its whole tree, and its count includes each sub-workspace. The user chose depth 3 as the deepest level on 16 November 2026 (decision 6 A), so a tree shows four levels. A create past that level fails, and its error tells the agent to make a sibling with a short prefix in its name. Sub-workspaces come oldest first, so the rows show the order of the work. The guide lines are neutral lines of the tree, as the indent guides of a file tree, not an accent on the edge of a row. So the fill of a hover or a selection still spans the whole row.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'none',
    palette: 'closed',
    subWorkspaces: 'trees',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})
