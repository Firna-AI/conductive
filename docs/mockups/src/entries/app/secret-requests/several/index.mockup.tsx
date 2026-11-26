import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const severalSecrets = defineScreen({
  title: 'Two secrets',
  description:
    'The agent deploys a preview that needs PROD_DATABASE_URL and VERCEL_TOKEN. The card names both, then each name with its description, the reason, and the command that the agent says it will run. One answer covers both secrets.',
  rationale:
    'A request names one or more secrets and the reason of the agent, so one task shows one card, as a Mac command request shows its reason. The other requests and the stack of several requests are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'secret-waiting-two' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
