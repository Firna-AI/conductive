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
        'The sandbox stopped while the agent worked, and no member and no part of the app asked for the stop. The running tool call shows as stopped, and the stopped line says "The cloud computer stopped". The line of the app under it says that the agent continues when the cloud computer starts again. The bar shows Resume until the app starts the sandbox, and Resume starts it at once. The agent then continues, as app/chat/cloud-computer-stops shows.',
      rationale:
        'The user chose option C of decision 72: the chat names the member who pressed Stop. Here no member pressed Stop, so the line names the cause and no member. The user chose C of decision 1 and B of decision 2 of the continuation plan on 20 November 2026: after such a stop, the app starts the sandbox again and continues the turn. A turn that stops with no Stop while the sandbox runs, such as at a restart of the agent runner, still says "The agent stopped".',
      props: { conversation: 'sandbox-stopped', banner: 'none' },
    },
  ],
})
