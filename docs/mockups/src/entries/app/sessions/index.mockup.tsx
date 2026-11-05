import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const sessions = defineScreen({
  title: 'Sessions',
  description:
    'A new session, after + at the end of the tabs: an empty chat with its own model picker. It works on the same branch and the same cloud computer as the two other sessions.',
  rationale:
    'Each agent session is a tab in the centre column, beside the open files and diffs. The current session shows a pencil to rename it, and every tab closes. The user chose several sessions per workspace, each with its own model picker, in decision 19. On a phone the sessions are tabs at the top of the Chat tab.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, tab: 'new-session' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
