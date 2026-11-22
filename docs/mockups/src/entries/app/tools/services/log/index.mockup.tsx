import { defineScreen } from '@mokly/mokly'
import { servicesWorkspace } from '../../../../../screens/servicesWorkspace'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { workspaceStateSchema } from '../../../../../screens/workspaceState'

export const serviceLog = defineScreen({
  title: 'The log of a service',
  description:
    'The scroll icon of web showed its log: a dialog on desktop and a sheet on a phone. Under the title, the state of web and its program. The end of its output shows as plain text, which wraps and scrolls. The cloud computer filters it, so the value of a secret shows as "[redacted]". The log holds more than one read gives, so a line says that earlier output is left out. Reload reads the end again. Close shows the list.',
  rationale:
    'Services decision 14 A shows filtered plain text with Reload, in a dialog on desktop and a sheet on a phone. Decision 9 B reads at most 200 lines and 64 KiB at a time, with a notice when the read leaves output out. The log reads add no activity, and every reader of the workspace may read them.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...servicesWorkspace, serviceView: 'log' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'loading',
      title: 'Loading',
      description:
        'The read of the log runs. A spinner and "Loading the log" take the place of the output, and Reload shows a spinner.',
      props: { serviceView: 'log-loading' },
    },
    {
      slug: 'failed',
      title: 'The log did not load',
      description:
        'The read of the log failed. The dialog says so, with the message of the server, and Try again takes the place of Reload.',
      props: { serviceView: 'log-failed' },
    },
    {
      slug: 'empty',
      title: 'No output yet',
      description:
        'worker has printed nothing yet, so the log says that its output shows there when it prints.',
      props: { serviceView: 'log-empty' },
    },
    {
      slug: 'memory',
      title: 'After a memory failure',
      description:
        'The log of storybook after the cloud computer ran out of memory. The state under the title shows Failed and Out of memory, and the output stops where the service stopped. Close shows the list with the failed row.',
      props: { services: 'memory', serviceView: 'log-memory' },
      useCasePaths: ['user-flows/read-a-failed-service-log'],
    },
  ],
})
