import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const secretResults = defineScreen({
  title: 'Results',
  description:
    'Cal allowed PROD_DATABASE_URL for this session while the agent waited. The card left the composer, and the run shows at its place in the chat: the secret, Allowed, the command that the agent says it will run, and "Allowed for this session by you". The tool call line of the agent above it says that the call ran. The agent gives the count and keeps working.',
  rationale:
    'Secrets decision 11 D: the run call sends the command text, and the Worker gets no output and no time of the command. So the card shows the names, the command that the agent says it will run, and what let it run, with no output and no duration. The tool call line of the agent, which the runner sends with its target and its state, says whether the command runs or ran, as for every tool call. An approval lasts for its session, through each later turn and sender. The run folds with the work of its turn, as app/secret-requests/in-work shows.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'secret-done' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'running',
      title: 'Running',
      description:
        'Just after Allow, the command runs with the value in its environment. The card says Allowed, and the tool call line of the agent says Running.',
      props: { conversation: 'secret-running' },
    },
    {
      slug: 'denied',
      title: 'Denied',
      description:
        'Cal denied the request. The card says Denied, and its line says that the command did not run. The tool call of the agent ended, and the agent goes on without the secret.',
      props: { conversation: 'secret-denied' },
    },
    {
      slug: 'pre-approved',
      title: 'Pre-approved',
      description:
        'The agent exports icons with FIGMA_TOKEN, which Cal pre-approved when he created the workspace. No card asked. The run says "Pre-approved for this workspace". A secret for all agents says "Available to all agents" in the same place.',
      props: { conversation: 'secret-pre-approved' },
    },
    {
      slug: 'value',
      title: 'Temporary value',
      description:
        'Cal gave a value of MAPBOX_TOKEN for 15 minutes. The card says "Value from you, for 15 minutes" under the command that the agent says it will run.',
      props: { conversation: 'secret-value' },
    },
  ],
})
