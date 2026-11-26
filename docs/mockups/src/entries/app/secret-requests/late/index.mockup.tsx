import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import { otherTabWalk } from '../../../../screens/tabWalks'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const lateRequest = defineScreen({
  title: 'Late request',
  description:
    'Nobody answered PROD_DATABASE_URL within 90 seconds. The tool call of the agent ended without a run, the agent said that it waits for a member, and the turn ended. The card stays just above the composer as a late request, with the command that the agent says it will run, Deny, and Allow for this session. Its line says that the agent stopped waiting and that Allow tells it in a new turn. It shows no age. The work of the turn folds, with the tool call line, and the answer of the agent stays in view. The composer shows no Stop, because the turn ended. The workspace keeps Needs input, and the tab of the session shows the needs-input mark.',
  rationale:
    'Each request of a tool call waits at most 90 seconds, because Claude stops a shell command after 2 minutes by default. The result of the call tells the agent that the request stays open. A request whose turn ends while the call waits becomes a late request in the same way. Decision 68 keeps needs input while any request waits. The user chose option A of decision 1 of the needs-input change on 20 November 2026: a late request stays above the composer until a member answers it or it ends, so a member finds it also when its turn is far up a long chat. Design calls of 20 November 2026: the card keeps its full form, because a member must see the command before the answer. It shows no age, because its line says that the agent stopped waiting. It brings back no Stop, because Stop follows the running turn. The answers are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, ...otherTabWalk.states.first.props },
  useCasePaths: ['user-flows/secret-request'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
