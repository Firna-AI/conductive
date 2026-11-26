import { defineScreen } from '@mokly/mokly'
import { servicesWorkspace } from '../../../../../screens/servicesWorkspace'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { workspaceStateSchema } from '../../../../../screens/workspaceState'

const flows = ['user-flows/stop-a-service', 'user-flows/restart-a-service']

export const serviceMenu = defineScreen({
  title: 'The menu of a service',
  description:
    'The menu button of web opened its menu: Restart, then Stop in the danger colour. On desktop the menu opens below its button, and the row keeps the fill of a hover. A phone shows the menu as a sheet with the name of the service. Restart runs at once. Stop asks first. Stop is off while a service does not run.',
  rationale:
    'Services decision 15 C confirms Stop and runs an explicit Restart directly. Restart is the first item, because it is the common repair of a dev server. Every member who may use Restart in the header may use Restart and Stop here (decision 3 A).',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...servicesWorkspace, serviceView: 'menu' },
  useCasePaths: flows,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'read-only',
      title: 'Read-only controls',
      description:
        'The viewer may read the workspace but may not restart its software, so the header shows its state as plain text. The rows keep their ports and Show log, and have no menu, so no row offers Restart or Stop. The source of each row stays the same.',
      rationale:
        'Services decision 3 A gives the controls the rule of the header Restart, and the list and the logs the right to read the workspace. The source of a row is context and gives no rights, so a member may stop a service that another member started.',
      props: { services: 'read-only', serviceView: 'none' },
    },
  ],
})
