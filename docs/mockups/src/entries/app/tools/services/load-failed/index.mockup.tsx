import { defineScreen } from '@mokly/mokly'
import { servicesWorkspace } from '../../../../../screens/servicesWorkspace'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { workspaceStateSchema } from '../../../../../screens/workspaceState'

export const servicesNotLoaded = defineScreen({
  title: 'Services not loaded',
  description:
    'The first read of the list of services failed. Under Services, the notice "The services didn\'t load" gives the message of the server and Try again, which reads the list again. No service row shows, so no port leaves Servers: every detected server shows there, and the server rows and the Other port row work as before. On desktop, port 3000, whose Preview tab shows, is the current row. On a phone the list shows after "+", and the ports with an open preview leave it, as they do with no services.',
  rationale:
    'A failed request shows its message and leaves the tool usable. A design call of 21 November 2026 applies the read rule of the app: only a read that fails before its data arrives shows the notice. A later read that fails keeps the services of the last read of this run of the cloud computer, with no notice, so app/tools/services draws that case. The notice is the one of the other lists of the app that did not load. The heading and the notice keep this state apart from software without services, which shows no Services part, and from an empty report, which shows one line.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...servicesWorkspace, services: 'load-failed' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
