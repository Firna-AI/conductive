import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const lateRequest = defineScreen({
  title: 'Late request',
  description:
    'Nobody answered PROD_DATABASE_URL within 90 seconds. The tool call of the agent ended without a run, the agent said that it waits for a member, and the turn ended. The card left the composer and stays as a widget at its place in the chat, with the command that the agent says it will run, Deny, and Allow for this session. Its line says that the agent stopped waiting and that Allow tells it in a new turn. The work before it folds, with the tool call line, and the widget stays in view. The workspace keeps Needs input.',
  rationale:
    'Each request of a tool call waits at most 90 seconds, because Claude stops a shell command after 2 minutes by default. The result of the call tells the agent that the request stays open. A request whose turn ends while the call waits becomes a late request in the same way. Decision 68 keeps needs input while any request waits. The widget does not fold into the work of its turn, so a member finds it. The answers are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'secret-late' },
  useCasePaths: ['user-flows/secret-request'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
