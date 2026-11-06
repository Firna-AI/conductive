import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceSchema,
} from '../../../screens/NewWorkspaceScreen'

export const newWorkspace = defineScreen({
  title: 'New workspace',
  description:
    'A new workspace is an empty chat: a compact repository picker, and the composer with its files and its model picker. Sending the first message creates the workspace.',
  rationale:
    "The user writes the task and sends it, and the app does the rest. The app names the branch with the GitHub login of the user and a city with a random suffix, such as calummoore/lisbon-7k2q, as the user chose in decision 53, and names the workspace after the city. The agent's first answer gives the workspace a short name from the task. There is no right column yet, because there are no files until the workspace exists.",
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
        'The workspace was not created, because its sandbox did not start. The message stays in the composer, and Try again sends it again.',
      props: { result: 'error' },
    },
  ],
})
