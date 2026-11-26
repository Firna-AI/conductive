import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const capabilitiesChanged = defineScreen({
  title: 'The note of a change',
  description:
    'While the agent of Address autocomplete runs the address tests for Cal, Priya pre-approves VERCEL_TOKEN in the Capabilities of the workspace. A line of the app shows in the chat at the time of the change, centred and muted, with the Capabilities icon: "Priya Raman pre-approved VERCEL_TOKEN." The name of the secret is in code style. The agent gets the same words in its running turn, as a steer. It then deploys the preview with VERCEL_TOKEN, and no card asks: the card of the run says "Pre-approved for this workspace". The other states are child pages, so this page shows only its canonical screen.',
  rationale:
    'Capability prompts decision 4 B: each session shows the change as a note, so members see what the agent was told, and who made the change. A line that only the agent sees was rejected. Decision 1 A: a change reaches each session that exists, as a steer while its turn runs. The note is a line of the app with no sender. It shows at its time and belongs to no turn, as the note of Continue, so it does not fold with the work when the turn ends. It names secrets only, never a value. Each session gets only the difference of its own facts: the other session of the workspace already has an approval of VERCEL_TOKEN, so it gets no note.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'capabilities-changed' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
