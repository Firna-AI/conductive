import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../../screens/NewWorkspaceScreen'

export const suspendedOrgNewWorkspace = defineScreen({
  title: 'New workspace in a suspended org',
  description:
    'The New workspace page of Acme opens from an old tab or a saved address after the operator suspended Acme. The refused bar of a workspace takes the place of the composer, with the words of the org: the org is suspended, and questions go to the abuse address. The empty chat invites no first message, and the sidebar has no New workspace.',
  rationale:
    'A suspended org refuses every create, and its list hides New workspace. The page can still open, so it shows the same refused bar as a workspace of the org in app/orgs/suspended/workspace. The bar replaces the start of the empty chat, because a first message cannot create the workspace.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, org: 'suspended' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
