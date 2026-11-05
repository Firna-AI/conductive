import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const reassign = defineScreen({
  title: 'Reassign a workspace',
  description:
    "The header names the owner of the workspace, Cal. An owner of the org opens the menu and picks another member to own it. The menu says that the cloud computer stops, and starts again with the new owner's accounts. On a phone the owner is an avatar in the header, and the menu is a sheet.",
  rationale:
    "The user decided on 5 November 2026 that each workspace belongs to the member who created it until an owner of the org reassigns it, and that its agents use that member's own accounts. So the menu says that the agents change with the owner. Reassigning stops the cloud computer first, because a new owner's accounts apply only at the next start. A member who is not an owner sees the owner without the menu.",
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
        'Priya, a member who is not an owner, opens the workspace of Cal. The header names Cal as the owner, without the menu that reassigns it, and without Archive, because only the owner of the workspace and the owners of the org archive it, as decision 42 says. The rail shows the avatar of Priya.',
      props: { overlay: 'none', viewer: 'member' },
    },
  ],
})
