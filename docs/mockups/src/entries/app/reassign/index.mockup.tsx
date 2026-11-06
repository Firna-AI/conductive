import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const reassign = defineScreen({
  title: 'Reassign a workspace',
  description:
    'The header names the owner of the workspace, Cal. An admin of the org opens the menu and picks another member to own it. The menu says that each message runs on the agent login of the person who sends it. On a phone the owner is an avatar in the header, and the menu is a sheet.',
  rationale:
    'The user decided on 5 November 2026 that each workspace belongs to the member who created it until an admin of the org reassigns it. The user chose option D of decision 49 on 6 November 2026: each message runs on the login of the person who sends it. So a new owner changes no login, and the cloud computer keeps running. A member who is not an admin sees the owner without the menu.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, overlay: 'reassign' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'Priya, a member who is not an admin, opens the workspace of Cal. The header names Cal as the owner, without the menu that reassigns it, and without Archive, because only the owner of the workspace and the admins of the org archive it, as decision 42 says. The rail shows the avatar of Priya.',
      props: { overlay: 'none', viewer: 'member' },
    },
    {
      slug: 'member-stop',
      title: 'Stop seen by a member',
      description:
        'Priya, a member who is not an admin, opens the workspace of Cal after Cal stopped the agent. The chat names the member who pressed Stop, so Priya sees "Cal stopped the agent". Cal sees "You stopped the agent", as the Interrupted state of the chat shows.',
      rationale:
        'The user chose option C of decision 72 on 6 November 2026: a stopped turn records the member who pressed Stop, and the chat names that member. All members of an org see the same chat, so a fixed "You" would be wrong for the other members.',
      props: {
        overlay: 'none',
        viewer: 'member',
        conversation: 'interrupted',
        banner: 'none',
      },
    },
  ],
})
