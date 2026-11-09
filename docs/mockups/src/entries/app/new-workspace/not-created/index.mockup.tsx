import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const notCreated = defineScreen({
  title: 'Not created',
  description:
    'The create request failed, here because the app could not reach the server. The message stays in the composer, and Try again sends it again with the same message ID.',
  rationale:
    'A failed first start keeps its workspace (decision 130), as app/new-workspace/error shows. So this form shows only a create request that failed. The form was at app/new-workspace/error until decision 130 D.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, result: 'error' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
