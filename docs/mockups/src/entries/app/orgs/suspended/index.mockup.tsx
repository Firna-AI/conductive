import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const suspendedOrgList = defineScreen({
  title: 'Suspended org',
  description:
    'Acme after the operator suspended it. Its members still open it, and its notice says that Acme is suspended, that its workspaces and settings are read-only, and where to write with questions. On desktop the notice fills the main area. On a phone and in a narrow window, it is at the top of the list. Every workspace shows as stopped, and the list has no New workspace and no section menus.',
  rationale:
    'The user chose on 8 November 2026 that the operator can suspend a user or an org, in decision 129. A suspended org stops its cloud computers and refuses every start, build, and image refresh. Its members keep their accounts and their other orgs, and they can still read its chats. Nothing in the org can change, so the screens show no action that the app would refuse. The notice has the design of a refused start, as in app/shell/refused, with its own words. It promises no files, because a stopped disk gets no restart near day 14, as decision 125 B says, and it does not say that the cloud computers are stopped, because a stop can still run. The tile in the rail looks the same, and its name says that the org is suspended.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'suspended', menu: 'none', palette: 'closed' },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})
