import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const newWorkspaceLink = defineScreen({
  title: 'Workspace link',
  description:
    'The first message names an earlier workspace. Cal pasted the link of Checkout address autocomplete, and the message box shows it as a chip at once, with the stopped state of that workspace.',
  rationale:
    'The message box of New workspace turns a pasted link into a chip, as the box of the chat does, from decision 150. The first message keeps the plain link, and the agent of the new workspace reads it. The workspace links page shows the chips in the chat.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, draft: 'workspace-link' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
