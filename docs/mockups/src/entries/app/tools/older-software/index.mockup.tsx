import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const terminalOlderSoftware = defineScreen({
  title: 'Older cloud computer software',
  description:
    'A workspace whose cloud computer has older software opens one terminal only, so the Terminal tool shows no tabs and no +. The workspace gets terminal tabs after the automatic software update, at a restart of the software or a later start of its cloud computer.',
  rationale:
    'Older cloud computer software cannot open a second shell, so a + there would open a copy of the first shell. An update while the workspace runs leaves the terminal service on its old software, so the tabs come when a restart of the software or the next start runs the new terminal service. Restart the software gives each kind of restart.',
  relatedDocs: [
    'docs/protocol/terminal.md',
    'docs/protocol/restart-the-software.md',
  ],
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
