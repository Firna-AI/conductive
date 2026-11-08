import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const sandboxError = defineScreen({
  title: 'Sandbox error',
  description:
    "The sandbox didn't start. The bar under the chat shows the message that the app saved for the start, the chat history stays, and Try again retries the start.",
  rationale:
    'The app shows the saved message of every failed start, because a start that passed its time limit keeps the same error code (decision 128).',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, sandbox: 'error' },

  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'time-limit',
      title: 'Start time limit',
      description:
        'The resume did not finish within the 20-minute limit of a start, for example because the startup script never ended. The bar names the limit, the chat history stays, and Try again starts the sandbox again.',
      rationale:
        'The user chose option C of decision 128 on 8 November 2026, and asked that the app tell the user of the limit. The limit covers the whole start: the allocation, the readiness, the startup script, and every retry. The screen shows the saved message, so a time-limit failure needs no separate error code.',
      props: { startError: 'time-limit' },
    },
  ],
})
