import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const sandboxStopped = defineScreen({
  title: 'Sandbox stopped',
  description:
    'The sandbox stopped while the workspace was open, for example in a background tab. The chat history stays, and Resume starts the sandbox again. All files and Changes keep the lists that the workspace saved. An open file tab keeps the file that it shows, and a file or a change that a member opens starts the sandbox again.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, sandbox: 'stopped' },

  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'during-turn',
      title: 'Stopped during a turn',
      description:
        'The sandbox stopped while the agent worked, so the turn ended without a Stop from a member. The running tool call shows as stopped, and the chat says "The agent stopped". Resume starts the sandbox again.',
      rationale:
        'The user chose option C of decision 72: the chat names the member who pressed Stop. Here no member pressed Stop, so the line names no member, as the chat protocol says.',
      props: { conversation: 'sandbox-stopped', banner: 'none' },
    },
  ],
})
