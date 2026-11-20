import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const capabilitiesChangedYou = defineScreen({
  title: 'As the member who made the change',
  description:
    'Priya, who pre-approved VERCEL_TOKEN, opens the session of Cal while its turn runs. The note says "You pre-approved VERCEL_TOKEN." Every other member reads her name. Cal lets other members use his login, so the bar of the composer says "Cal\'s login".',
  rationale:
    'The chat names the viewer "You", as the note of Continue and the line of a late answer do. The agent gets the name of the member who made the change.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'capabilities-changed',
    viewer: 'member',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
