import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const reassign = defineScreen({
  title: 'Reassign a workspace',
  description:
    'The header names the owner of the workspace, Cal. An owner of the org opens the menu and picks another member to own it. On a phone the owner is an avatar in the header, and the menu is a sheet.',
  rationale:
    "The user decided on 5 November 2026 that each workspace belongs to the member who created it until an owner of the org reassigns it, and that its agents use that member's own accounts. So the menu says that the agents change with the owner. A member who is not an owner sees the owner without the menu.",
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, overlay: 'reassign' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
