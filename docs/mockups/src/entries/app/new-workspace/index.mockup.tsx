import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../screens/NewWorkspaceScreen'

export const newWorkspace = defineScreen({
  title: 'New workspace',
  description:
    'A new workspace is an empty chat: a compact repository picker, and the composer with its files and its model picker. Sending the first message creates the workspace.',
  rationale:
    'The user writes the task and sends it, and the app does the rest. The app names the branch with the GitHub login of the user and a city with a random suffix, such as calummoore/lisbon-7k2q, as the user chose in decision 53, and names the workspace after the city. When the app accepts the first message, a small model writes a short title from it. About a second later the workspace takes the title as its name, while its sandbox starts. There is no right column yet, because there are no files until the workspace exists. The other states of the page are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: newWorkspaceForm,
  useCasePaths: ['user-flows/create-workspace'],
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
