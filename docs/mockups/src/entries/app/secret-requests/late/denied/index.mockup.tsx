import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const lateDenied = defineScreen({
  title: 'Denied later',
  description:
    'Cal denied the late request. The widget says Denied, and its line says that he denied it. No line and no turn follow, and the workspace no longer needs input.',
  rationale:
    'A late deny sends nothing, because the call of the agent already ended and the agent waits for nothing.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'secret-late-denied' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
