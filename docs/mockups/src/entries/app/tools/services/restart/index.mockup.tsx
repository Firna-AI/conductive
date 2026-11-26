import { defineScreen } from '@mokly/mokly'
import { servicesWorkspace } from '../../../../../screens/servicesWorkspace'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { workspaceStateSchema } from '../../../../../screens/workspaceState'

const flow = ['user-flows/restart-a-service']

export const restartService = defineScreen({
  title: 'Restart a service',
  description:
    'Restart in the menu of web ran at once, with no question. Its row shows a spinner and Restarting…, and its menu is off until the result. The Preview tab of port 3000 stays.',
  rationale:
    'Services decision 15 C runs an explicit Restart directly, because a Restart ends nothing that it does not start again. A Restart uses the saved command of the service.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...servicesWorkspace, services: 'restarting' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'restarted',
      title: 'After Restart',
      description:
        'web runs again: its row shows Running and Started just now, with port 3000. The row keeps its place in the list. A Reload of the Preview tab shows the page from the new run.',
      props: { services: 'restarted' },
      useCasePaths: flow,
    },
  ],
})
