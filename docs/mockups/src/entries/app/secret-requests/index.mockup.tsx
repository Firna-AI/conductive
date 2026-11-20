import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const secretRequests = defineScreen({
  title: 'Secret requests',
  description:
    'Cal asked how many saved addresses in production have no postcode. The agent runs a script with PROD_DATABASE_URL, which this session may not use yet, and its tool call line says Running. While the tool call waits, a compact card shows just above the composer: the name of the secret, its description, the reason of the agent, and the command that the agent says it will run, never a value. It offers Deny and Allow for this session. The header and the workspace list show Needs input.',
  rationale:
    'Secrets decision 1 B: after approval, the workspace tools start one command with the values in its environment, so the agent and the model see only the name. Each session needs an approval for each secret, unless the creator of the workspace pre-approved it or the secret is for all agents. The card sits where the request of a Mac command waits (decisions 62 and 68), and both share one region above the composer. Any member who sees the session answers, in any browser or in the Mac app (secrets decision 4 B), so no member sees the card without its choices. One answer covers the request. The run call sends its command too (secrets decision 11 D), so the card shows it, labelled as the command that the agent says it will run, because nothing checks that the agent runs it. The card shows no time limit: after 90 seconds it stays in the chat as a late request, as app/secret-requests/late shows. The other states are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'secret-waiting' },
  useCasePaths: ['user-flows/secret-request'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
