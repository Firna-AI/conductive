import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const notCreated = defineScreen({
  title: 'Not created',
  description:
    'The workspace was not created, because its sandbox did not start. The message stays in the composer, and Try again sends it again.',
  rationale:
    'Moved here from a saved state of the New workspace page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { result: 'error' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
