import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { computerPaths } from '../../../../../computerPaths'
import { ownComputerPages } from '../../../../../screens/ownComputerPages'
import { workspaceStateSchema } from '../../../../../screens/workspaceState'

export const ownComputerMenu = defineScreen({
  title: 'Header state menu',
  description:
    'Checkout address autocomplete on build-01, with the menu of the header state open. Its first line says that the workspace runs on build-01, an own computer of Acme, and Restart follows with its note. A screen reader names the menu build-01 in place of Cloud computer. A phone shows the same menu in a sheet.',
  rationale:
    'The menu of the header state is the menu of the computer of the workspace, so it names the own computer. The cloud computer is the default, so a workspace on the cloud computer shows no such line. Moved here from a variant of app/shell/own-computer, with the same path, so that the page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: ownComputerPages[computerPaths.workspace.menu],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
