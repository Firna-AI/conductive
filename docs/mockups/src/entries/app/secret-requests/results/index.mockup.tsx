import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const secretResults = defineScreen({
  title: 'Results',
  description:
    'Cal allowed PROD_DATABASE_URL for this session while the agent waited. The card left the composer, and the run shows at its place in the chat: the secret, Done in 4s, the command, "Allowed for this session by you", and the output. The script printed the address of the replica, which shows as [redacted]. The agent then gives the count.',
  rationale:
    'The workspace tools and the chat hide each exact copy of a value in the output of the command, with the marker of the org env vars (secrets decision 1 B). An approval lasts for its session, through each later turn and sender. The run shows at its place as a Mac command does once answered, and it folds with the work of its turn, as app/secret-requests/in-work shows.',
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
        'Just after Allow, the command runs with the value in its environment. The card says Running, and the agent keeps working.',
      props: { conversation: 'secret-running' },
    },
    {
      slug: 'denied',
      title: 'Denied',
      description:
        'Cal denied the request. The card says Denied, and its line says that the command did not run. The agent goes on without the secret.',
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
        'Cal gave a value of MAPBOX_TOKEN for 15 minutes. The run says "Value from you, for 15 minutes", and its output hides the token.',
      props: { conversation: 'secret-value' },
    },
  ],
})
