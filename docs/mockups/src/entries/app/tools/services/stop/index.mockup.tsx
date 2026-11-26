import { defineScreen } from '@mokly/mokly'
import { servicesWorkspace } from '../../../../../screens/servicesWorkspace'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { workspaceStateSchema } from '../../../../../screens/workspaceState'

const flow = ['user-flows/stop-a-service']

export const stopService = defineScreen({
  title: 'Stop a service',
  description:
    'Stop in the menu of web asks "Stop web?" first, because the stop ends the service for everyone in the workspace. Desktop shows a dialog, and a phone shows a sheet. Cancel changes nothing. Stop names the run that the list shows.',
  rationale:
    'Services decision 15 C confirms Stop, as the close of a terminal asks first. Decision 16 E: each control names the run that the member saw, so a Stop for a run that already ended changes nothing.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...servicesWorkspace, serviceView: 'stop' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'stopping',
      title: 'Stopping',
      description:
        'The Stop of web runs. Its row shows a spinner and Stopping…, and its menu is off until the result. Its port and Show log stay.',
      props: { services: 'stopping', serviceView: 'none' },
      useCasePaths: flow,
    },
    {
      slug: 'stopped',
      title: 'After Stop',
      description:
        'web shows Stopped, and it listens on no port. The Preview tab of port 3000 stays in the centre row with the page that it loaded, and the list shows port 3000 under Servers by its number. A Reload of the tab shows that nothing answers. Restart in the menu runs web again with its saved command. On a phone the preview of port 3000 stays open too.',
      rationale:
        'A Stop or a Restart closes no Preview tab and no preview, so the member can reload the page after a Restart.',
      props: { services: 'stopped', serviceView: 'none' },
      useCasePaths: flow,
    },
  ],
})
