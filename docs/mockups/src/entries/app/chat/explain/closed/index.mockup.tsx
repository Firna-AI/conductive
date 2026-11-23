import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const explainClosed = defineScreen({
  title: 'A closed explanation',
  description:
    'Cal closed the tab of the explanation, so it is in the session history, and the row has no tab for it. Its mark stays, and a press opens the popover to read its chat. The notice over the follow-up field says that a follow-up reopens the explanation, as Expand does. Its tab then opens at the end of the row.',
  rationale:
    'A press on the mark of a closed explanation opens the popover to read its chat. A send or Expand there reopens the session, as a session link does, and its tab shows again for every member. A close of the parent session leaves its explanations as they are.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-running',
    explainMarks: 'asked',
    explainSession: 'closed',
    explainOpen: 'popover',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
