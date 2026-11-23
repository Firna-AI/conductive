import { defineScreen } from '@mokly/mokly'
import { servicesWorkspace } from '../../../../../screens/servicesWorkspace'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { workspaceStateSchema } from '../../../../../screens/workspaceState'

export const unavailableServices = defineScreen({
  title: 'No services',
  description:
    'The report of the cloud computer holds no service yet. Under Services, one line asks the user to have the agent start a server as a service, and says that it runs until the cloud computer stops. Every detected server shows under Servers.',
  rationale:
    'A new run of the cloud computer starts with no services, because services decision 11 A keeps no service through a stop. So the line says how long a service runs. The empty report differs from software without services, as the port list keeps no report apart from a report with no server.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...servicesWorkspace, services: 'empty' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'older-software',
      title: 'Older cloud computer software',
      description:
        'The software of the cloud computer has no services, so the Preview tool shows its servers as before, with no Services part. The workspace gets services after the automatic software update, or after a Restart in the header, which installs updates.',
      rationale:
        'Older software sends no services, and older copies of the Mac app read the port list as before. The tool then shows nothing that the software cannot do.',
      props: { services: 'unsupported' },
    },
    {
      slug: 'stopped',
      title: 'Stopped cloud computer',
      description:
        'The cloud computer stopped, so every service ended with it. The Preview tool shows the state of the cloud computer with Resume, as the other tools do, and no list. After Resume the list is empty, until an agent or a member starts a service again.',
      rationale:
        'A stop ends every process. The workspace clears the services of the stopped run, so no row offers a service that the stop ended. A service never keeps the cloud computer running (services decision 1 B), and decision 11 A brings no service back after a resume.',
      props: { sandbox: 'stopped', tab: 'session' },
    },
  ],
})
