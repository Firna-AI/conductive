import { defineScreen } from '@mokly/mokly'
import { servicesWorkspace } from '../../../../../screens/servicesWorkspace'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { workspaceStateSchema } from '../../../../../screens/workspaceState'

export const serviceResults = defineScreen({
  title: 'Results of a control',
  description:
    'The Stop of web failed. The toast names the service and gives the message of the server. web keeps running, and its menu works again, so the member can stop it again. A failed Restart shows its toast in the same way.',
  rationale:
    'A failed change names what failed and gives the message of the server, as the toast of a terminal that did not close does. The row shows the actual state from the report, not the state that the member asked for.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...servicesWorkspace, serviceView: 'stop-failed' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'unconfirmed',
      title: 'Unconfirmed',
      description:
        'The reply to the Stop of web was lost, so the app cannot say whether the Stop ran. The toast says that the Stop is unconfirmed. The app asked for the actual state, and the list shows it: web still runs, so the member can stop it again.',
      rationale:
        'Services decision 16 E reports Unconfirmed after a lost reply and refreshes the actual state. A retry by itself was rejected, because a control must not run twice.',
      props: { serviceView: 'unconfirmed' },
    },
    {
      slug: 'stale',
      title: 'A control for an older run',
      description:
        'Another member restarted web before this Stop arrived. The Stop named the run that this member saw, so it changed nothing. The toast says that the Stop did not run, and the list shows the new run, which started just now.',
      rationale:
        'Services decision 16 E: a control names the observed run, and a stale control changes nothing. So a Stop never ends a run that the member did not see.',
      props: { services: 'restarted', serviceView: 'stale' },
    },
  ],
})
