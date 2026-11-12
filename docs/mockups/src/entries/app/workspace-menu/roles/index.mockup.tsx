import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const workspaceMenuRoles = defineScreen({
  title: 'Roles and read-only rows',
  description:
    'Priya, a member who is not an admin, right-clicks Apple Pay button, a workspace of Cal. Her menu has Move to section, Rename, and Copy link: only admins reassign, and only the owner and the admins archive. The rail shows her avatar. On a phone her sheet has the same three actions.',
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
        'Priya opens the Archived group and right-clicks Checkout page redesign. Its menu has only Copy link, because an archived workspace does not move, take a new name, or archive again, and only an admin reassigns it. The row keeps Restore over its time, because every member can restore a workspace until its last day of Restore.',
      rationale:
        'The user chose option B of decision 2 of PR #138 on 10 November 2026: every member of an org that is not suspended may restore. Restore stays on the row, so the menu keeps its own actions. Copy link changes nothing, so every row offers it, as the request of the user of 12 November 2026 asks.',
      props: { menu: 'workspace-archived-member' },
    },
    {
      slug: 'suspended',
      title: 'Suspended org',
      description:
        'Acme after the operator suspended it. Nothing in the org can change, so no row has Archive, and the menu of Apple Pay button has only Copy link.',
      rationale:
        'A suspended org refuses every change, from decision 129, so its screens show no action that it refuses, as app/orgs/suspended shows. Copy link changes nothing, so it stays.',
      props: { list: 'suspended', menu: 'workspace' },
    },
  ],
})
