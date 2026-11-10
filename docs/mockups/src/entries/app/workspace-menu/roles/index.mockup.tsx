import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const workspaceMenuRoles = defineScreen({
  title: 'Roles and read-only rows',
  description:
    'Priya, a member who is not an admin, right-clicks Apple Pay button, a workspace of Cal. Her menu has Move to section and Rename: only admins reassign, and only the owner and the admins archive. The rail shows her avatar. On a phone her sheet has the same two actions.',
  rationale:
    'The menu shows only the actions that the person can use, so no action is greyed out. Every member of the org moves and renames a workspace. Only an admin reassigns one, from decision 54, and only its owner and the admins archive it, from decision 42.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'workspace-member', palette: 'closed' },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'own',
      title: 'A workspace of the member',
      description:
        'Priya right-clicks Pricing page copy, her own workspace. Her menu adds a line and Archive, because the owner of a workspace archives it.',
      props: { menu: 'workspace-own' },
    },
    {
      slug: 'archived',
      title: 'Archived rows of a member',
      description:
        "Priya opens the Archived group. She has no action on an archived row, so a right click on Checkout page redesign opens the browser's own menu. Under the pointer the row shows only the fill of a hover.",
      props: { menu: 'workspace-archived-member' },
    },
    {
      slug: 'suspended',
      title: 'Suspended org',
      description:
        "Acme after the operator suspended it. Nothing in the org can change, so no row has a menu or Archive, also Apple Pay button under the pointer. A right click opens the browser's own menu.",
      rationale:
        'A suspended org refuses every change, from decision 129, so its screens show no action that it refuses, as app/orgs/suspended shows.',
      props: { list: 'suspended', menu: 'workspace-hover' },
    },
  ],
})
