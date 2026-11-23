import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import { computerPaths } from '../../../../computerPaths'
import { ownComputerPages } from '../../../../screens/ownComputerPages'
import { workspaceStateSchema } from '../../../../screens/workspaceState'

export const ownComputerWorkspace = defineScreen({
  title: 'On an own computer',
  description:
    'Saved carts, a new workspace on build-01, an own computer of Acme. The first step of the start names build-01 where a workspace on the cloud computer names the cloud computer of Acme, and the message waits until the sandbox is ready. Its child pages show the menu of the header state, which names build-01, and a workspace that stopped after lab-server went offline. Others show a resume that waits for lab-server, and the start that failed at the 20-minute limit while lab-server stayed offline. Two more show a resume that waits for a free place on build-02, which is full, and its failure at the limit. The last has a workspace whose own computer an admin removed.',
  rationale:
    'Each workspace on an own computer runs in its own container there, with the same sandbox software as a cloud computer (own computer decision 1 D). So the workspace looks the same, and each text that names the cloud computer of the workspace names its own computer instead. A workspace never moves between a cloud computer and an own computer. The states of this page moved into their own folders with the same paths, so that it shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: ownComputerPages[computerPaths.workspace.starting],
  useCasePaths: ['user-flows/create-workspace-on-own-computer'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
