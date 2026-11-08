import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const notCreatedTimeLimit = defineScreen({
  title: 'Not created: start time limit',
  description:
    'The workspace was not created, because its first start did not finish within the 20-minute limit. The notice names the limit with the message that the app saved for the start. The message stays in the composer, and Try again sends it again.',
  rationale:
    'The user chose option C of decision 128 on 8 November 2026, and asked that the app tell the user of the limit. A failed first start removes the workspace and returns the message, as the protocol says, so the limit shows here. Moved here from a saved state of the New workspace page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, result: 'time-limit' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
