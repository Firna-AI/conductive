import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const sandboxStarting = defineScreen({
  title: 'Sandbox starting',
  description:
    'Opening a stopped workspace resumes its sandbox. The chat history shows at once, with the steps of the resume at its end, and the files and tools wait until the sandbox is ready.',
  rationale:
    'The user chose option C of decision 128 on 8 November 2026: each whole create and resume has a 20-minute limit from its start. On 10 November 2026 the user asked to remove the note of that limit from the chat. So the card shows only the steps and the time since the start. A start that passes the limit names it in its error, as app/shell/error/time-limit shows.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, sandbox: 'starting' },
  useCasePaths: [
    'user-flows/reopen-stopped-workspace',
    'user-flows/open-workspace-from-palette',
  ],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
