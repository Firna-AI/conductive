import { defineScreen } from '@mokly/mokly'
import { servicesWorkspace } from '../../../../../screens/servicesWorkspace'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { workspaceStateSchema } from '../../../../../screens/workspaceState'

export const endedServices = defineScreen({
  title: 'Ended and failed services',
  description:
    'Runs that ended stay in the list until the cloud computer stops. seed ran to its end, so it shows Ended with exit code 0. The run of storybook failed with exit code 1, and the command of emails could not start. A failed run shows Failed in the danger colour, with an icon, so the state never depends on colour alone. The ports of an ended run leave its row. On desktop, port 6006 still has its Preview tab, so it shows under Servers by its number. Restart in the menu runs the saved command again. Nothing starts again by itself.',
  rationale:
    'Services decision 13 A restarts a service only after an explicit Start or Restart, and keeps exit results and failures visible. Decision 17 A adds no Remove: ended records stay until the computer run ends, and a Start with the same name uses the name again. Decision 11 A keeps the records only for the run of the cloud computer.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...servicesWorkspace, services: 'ended' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'memory',
      title: 'Out of memory',
      description:
        'The cloud computer ran out of memory while storybook built, so the whole service stopped. Its row shows Failed and Out of memory. web and worker keep running. The scroll icon of the row shows the end of its log.',
      rationale:
        'Services decision 18 A stops the whole service after a memory kill and reports Failed. Decision 12 A adds no memory limit for a service. The rule for the commands of an agent turn does not change.',
      props: { services: 'memory' },
      useCasePaths: ['user-flows/read-a-failed-service-log'],
    },
  ],
})
