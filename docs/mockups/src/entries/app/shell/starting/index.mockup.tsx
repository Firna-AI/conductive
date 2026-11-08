import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const sandboxStarting = defineScreen({
  title: 'Sandbox starting',
  description:
    'Opening a stopped workspace resumes its sandbox. The chat history shows at once, with the steps of the resume at its end, and the files and tools wait until the sandbox is ready. Under the steps, a note says that each start has a 20-minute limit.',
  rationale:
    'The user chose option C of decision 128 on 8 November 2026: each whole create and resume has a 20-minute limit from its start, and the app tells the user of the limit. The note keeps the limit out of the title of the card.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, sandbox: 'starting' },
  useCasePaths: ['user-flows/reopen-stopped-workspace'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
