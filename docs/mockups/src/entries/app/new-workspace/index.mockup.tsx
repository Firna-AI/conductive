import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceSchema,
} from '../../../screens/NewWorkspaceScreen'

export const newWorkspace = defineScreen({
  title: 'New workspace',
  description:
    'Choose the repository, name the workspace and its branch, pick the agent, and write an optional first message.',
  rationale:
    'The first message lets the agent start as soon as the sandbox is ready, so the user does not wait on the start. The branch name follows the workspace name until the user edits it.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { result: 'form' },
  useCasePaths: ['user-flows/create-workspace'],
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'error',
      title: 'Not created',
      description:
        'The sandbox of the new workspace did not start. The form keeps its values, and the main action becomes Try again.',
      props: { result: 'error' },
    },
  ],
})
