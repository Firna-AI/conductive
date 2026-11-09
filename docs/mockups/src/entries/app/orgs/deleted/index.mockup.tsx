import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const deletedOrg = defineScreen({
  title: 'Deleted org',
  description:
    'Acme after an admin deleted it: its cloud computers are stopped, and its members cannot open it. The rail keeps it faded for its admins, and its page names the date when everything is deleted, with Restore Acme.',
  rationale:
    'The user chose option D of decision 30 on 5 November 2026: Delete org stops every machine and hides the org at once, and deletes everything after 7 days unless an admin restores it. The org stays in the rail of its admins, so the one who deleted it finds the restore where the org was. Restore brings back the org as it was, and its workspaces start again when they open.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'deleted', menu: 'none', palette: 'closed' },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})
