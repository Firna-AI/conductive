import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const newWorkspaceFast = defineScreen({
  title: 'Fast mode',
  description:
    'New workspace with the model menu open and Fast on. The first message then runs fast, and so does the session that it starts. The Fast row shows no key here.',
  rationale:
    'Every composer uses the same picker, so the first message of a new workspace can turn fast on, as app/fast-mode shows for a session (fast mode decision 255). The key of Fast mode runs only where a session tab is shown (fast mode decision 258), so the row shows no key.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, modelMenu: 'open-fast' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
