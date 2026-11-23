import { defineScreen } from '@mokly/mokly'
import { servicesWorkspace } from '../../../../../screens/servicesWorkspace'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { workspaceStateSchema } from '../../../../../screens/workspaceState'

export const severalPorts = defineScreen({
  title: 'A service with several ports',
  description:
    'dev runs turbo dev, which starts nine servers, so the service listens on nine ports. The third line of its row holds every port as a button, and the line wraps when the ports do not fit. Show log and the menu keep their place at the end of the first line. Port 3000 is the port of the shown Preview tab, so its button is the current one.',
  rationale:
    'The report gives each port that a service listens on, through the processes of the service, so a parent command such as turbo dev or npm run dev can hold many servers. A design call of 20 November 2026 gives the ports their own line that wraps, so no count of ports can push the controls out of the row. The list adds no limit on ports.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...servicesWorkspace, services: 'ports' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
