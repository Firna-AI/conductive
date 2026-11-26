import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const capabilitiesChangedIdle = defineScreen({
  title: 'An idle session',
  description:
    'No turn runs when Priya pre-approves VERCEL_TOKEN. The note shows at the time of the change, after the last turn, and no turn starts for it. Later Cal asks for a preview. The agent gets the words of the note in the same prompt as his message, so it says that VERCEL_TOKEN is pre-approved now, and it deploys the preview with no card.',
  rationale:
    'Capability prompts decision 3 A: in an idle session the change waits, and the agent gets it in the turn that the next message starts. A turn for each change was rejected, because each open session would wake, use tokens, and act for the member who changed the control. A change that only running turns get was rejected, because an idle session would never learn of it.',
  relatedDocs: ['docs/protocol/capabilities-agents.md'],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'capabilities-changed-idle' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
