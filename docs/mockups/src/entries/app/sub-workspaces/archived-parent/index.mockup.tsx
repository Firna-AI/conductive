import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const subWorkspacesArchivedParent = defineScreen({
  title: 'Archived parent',
  description:
    'Cal archived Places API client, the middle row of the deepest tree, after its merge. Its row left the tree for the Archived group at the end of the list, the last archived first, and Cal opened the group. Rate limits and Rate limits: Load test still work, so they show under Address search API, the nearest row above them in their tree, and indent one step less than before. Suggestion list keeps its place. A Restore puts Places API client back under Address search API, with its sub-workspaces under it again. On a phone the Archived group is at the end of the list page.',
  rationale:
    'The user chose option C of sub-workspace decision 5 on 16 November 2026: a live sub-workspace whose parent the list does not show goes under the nearest live workspace above it in its tree, or to the top level of its section when none is left. Archive stops no other work, so each tree keeps as much of its shape as its live rows allow. An archived workspace does not work, so the Archived group stays flat, and a live sub-workspace never shows in it. The indent follows the rows that the list shows, not the depth of the record, so a row under its grandparent indents one step less than its depth.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'none',
    palette: 'closed',
    subWorkspaces: 'archived-parent',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})
