import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../../screens/WorkspaceListScreen'

export const suspendedDeletedOrg = defineScreen({
  title: 'Deleted org that is suspended',
  description:
    'Acme after an admin deleted it and the operator suspended it, as its admins see it. The notice of the org, with the abuse address, is above the page of the deleted org. The page keeps the date when everything is deleted and the facts of the delete, and offers no Restore.',
  rationale:
    'A suspended org refuses a restore, as it refuses each change but a leave. The deletion still goes on, so the page keeps its date and its facts. The same notice as on the other pages of a suspended org says why Restore is missing, and gives the address for questions.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'deleted-suspended', menu: 'none', palette: 'closed' },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})
