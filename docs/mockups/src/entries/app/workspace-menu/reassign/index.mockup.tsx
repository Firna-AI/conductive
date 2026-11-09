import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const workspaceMenuReassign = defineScreen({
  title: 'Reassign to',
  description:
    'Reassign to opens the members of Acme beside the menu, with Cal, the owner of Apple Pay button, checked, and the note that each session runs on the agent login of the member who started it. These are the choices of the owner in the header of a workspace. On a phone the sheet shows the members in place of the menu.',
  rationale:
    'Only an admin of the org reassigns a workspace, from decision 54, so only an admin sees Reassign to. The choices load, fail, and save as they do in the header, and a new owner changes no login and does not stop the cloud computer.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'workspace-reassign', palette: 'closed' },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'archived',
      title: 'An archived row',
      description:
        'Cal, an admin, opens the Archived group and right-clicks Checkout page redesign. Its menu has only Reassign to, because an archived workspace does not move, take a new name, or archive again. On a phone the sheet has the same one action.',
      rationale:
        "An admin can still give an archived workspace a new owner. A member who is not an admin has no action on an archived row, so the row shows no More, and a right click opens the browser's own menu, as the Roles page shows.",
      props: { menu: 'workspace-archived-row' },
    },
  ],
})
