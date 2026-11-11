import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const newWorkspaceFast = defineScreen({
  title: 'Fast mode',
  description:
    'New workspace with the model menu open and Fast on. The first message then runs fast, and so does the session that it starts.',
  rationale:
    'Every composer uses the same picker, so the first message of a new workspace can turn fast on, as app/fast-mode shows for a session (decision 255).',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, modelMenu: 'open-fast' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
