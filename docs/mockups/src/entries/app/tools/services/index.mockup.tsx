import { defineScreen } from '@mokly/mokly'
import { servicesWorkspace } from '../../../../screens/servicesWorkspace'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import { workspaceStateSchema } from '../../../../screens/workspaceState'

export const services = defineScreen({
  title: 'Services',
  description:
    'The Preview tool lists the services of the cloud computer above its servers. A service is a named server that runs outside every agent turn, until the cloud computer stops. Each row shows the exact name, the program and its folder, the ports, the state, the time of the start, and where the service started: the session whose agent started it, or Local command. web runs next dev on port 3000, the port of the shown Preview tab, so its port is the current one. storybook runs in packages/ui, from a terminal. worker listens on no port, and it stays in the list. A port opens its preview. The scroll icon shows the log, and the menu holds Restart and Stop. The servers that no service runs follow under Servers. On a phone the list shows after "+", under the tabs of the open previews. The child pages show ended and failed runs, the empty and unavailable lists, a list that did not load, the menu, Stop, Restart, the results of a control, and the log.',
  rationale:
    'Cal approved services decision 19 A on 20 November 2026, with services decision 1 B: a service is never activity, so it never keeps the cloud computer running, and a preview of it adds no time. Decision 6 A lists services in Preview, also with no port, with Stop, Restart, and Show log. No Services tool, no terminal tab, and no Remove were chosen. Decision 4 D shows the filtered program label of the port list, with its cut of 40 characters, and keeps the full command and its env vars in the cloud computer. Decision 5 A shows the matched session, or Local command. The source is context, not proof of a person, and it gives no rights. Show log stays out of the menu, because every reader may read the log, while Restart and Stop follow the rule of the header Restart. A design call of 20 November 2026 keeps the rows in the order of their names, so a row keeps its place after a Restart.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: servicesWorkspace,
  useCasePaths: ['user-flows/stop-a-service', 'user-flows/restart-a-service'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
