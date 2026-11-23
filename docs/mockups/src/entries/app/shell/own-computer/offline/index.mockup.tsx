import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const ownComputerOffline = defineScreen({
  title: 'Offline at the start limit',
  description:
    'lab-server did not connect within the 20-minute limit of a start. The bar of the failed start shows the saved message, which names lab-server and the limit, says that the files and the chat are saved, and offers Try again.',
  rationale:
    'A start on an offline own computer fails at the 20-minute start limit, with Try again, as the design calls of the plan say. The saved message names the computer, so a member knows where the start waited. Moved here from a variant of app/shell/own-computer, with the same path, so that the page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, sandbox: 'error', computer: 'offline' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
