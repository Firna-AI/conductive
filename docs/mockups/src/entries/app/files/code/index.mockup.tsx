import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesCode = defineScreen({
  title: 'Code preview',
  description:
    'A code file opened from All files: a tab with line numbers and syntax colours. Its row in the list is marked. A press on its chip in a message opens the same tab.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
    tab: 'code',
  },
  useCasePaths: ['user-flows/mention-a-file'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
