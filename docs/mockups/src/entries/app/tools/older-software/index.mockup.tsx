import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const terminalOlderSoftware = defineScreen({
  title: 'Older cloud computer software',
  description:
    'A workspace whose cloud computer has older software opens one terminal only, so the Terminal tool shows no tabs and no +. A new workspace after the next Build computer gets terminal tabs.',
  rationale:
    'The software of a cloud computer comes from the image that it started from, so an older workspace cannot open a second shell. A + there would open a copy of the first shell.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'running',
    banner: 'none',
    tool: 'terminal',
    terminals: 'older',
    focus: 'tool',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
