import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const ownComputerRemoved = defineScreen({
  title: 'Computer removed',
  description:
    'An admin removed old-runner, the own computer of this workspace. The start is refused, so the bar says that the sandbox cannot start, because old-runner was removed from Acme, and that the chat history is available. It offers no action. After an Archive, the bar of the workspace says that its files stay on old-runner, as app/archive/computer-removed shows.',
  rationale:
    'The design calls of the plan say that the workspaces of a removed computer keep their chat. A workspace never moves to another computer, so the refusal lasts, as for any refused start. Moved here from a variant of app/shell/own-computer, with the same path, so that the page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, sandbox: 'refused', computer: 'removed' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
