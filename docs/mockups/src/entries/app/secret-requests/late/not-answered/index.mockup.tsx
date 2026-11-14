import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const lateNotAnswered = defineScreen({
  title: 'Not answered',
  description:
    'Cal archived the workspace while the late request waited. The request ended as Not answered, with no choices, and its line says that it ended when the workspace was archived. The workspace shows Archived, not Needs input. A suspension of the org ends each open request in the same way, and its line names the suspension.',
  rationale:
    'Item 3 A of the mockups: an archived workspace and a suspended org run no turn, so an answer could not reach the agent. Each open request ends as Not answered, and Needs input ends. Restore does not bring the request back.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'secret-late-archived',
    sandbox: 'archived',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
