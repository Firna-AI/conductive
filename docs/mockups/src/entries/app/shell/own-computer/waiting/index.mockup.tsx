import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const ownComputerWaiting = defineScreen({
  title: 'Waiting for the computer',
  description:
    'Checkout address autocomplete resumes on lab-server, which is offline. The start shows one step, Waiting for lab-server to connect, with its time. The workspace starts when lab-server connects. Resume on the bar of a workspace that stopped after lab-server went offline leads here.',
  rationale:
    'A start on an offline own computer waits for it until the 20-minute limit of a start, as the design calls of the plan say. The stop rule stays. A resume after the computer went offline waits in the same way (own computer decision 10 B). Moved here from a variant of app/shell/own-computer, with the same path, so that the page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, sandbox: 'starting', computer: 'offline' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
