import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../screens/WorkspaceListScreen'

export const orgs = defineScreen({
  title: 'Orgs',
  description:
    'On a phone, the org name at the top of the list opens the org switcher: every org, Create org, and the account. On desktop the rail is the switcher, and it names an org when the pointer is on it. Each person puts the orgs in their own order, as app/orgs/reorder shows.',
  rationale:
    'A phone has no rail, so the switcher takes its place. The account sits at the bottom of the rail and of the switcher, because the GitHub sign-in, the GitHub App, and the agents belong to every org. Waits on decision 21, drawn as its recommended option A.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'orgs', palette: 'closed' },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})
