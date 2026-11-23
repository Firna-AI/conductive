import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const capabilitiesChangedRemoved = defineScreen({
  title: 'Removed',
  description:
    'Jonas removed the pre-approval of FIGMA_TOKEN in the Capabilities of the workspace. Later, Priya removed the value of MAPBOX_TOKEN for this workspace. Each write gives its own note, with its own member: "Jonas Weber removed the pre-approval of FIGMA_TOKEN." and "Priya Raman removed the value of MAPBOX_TOKEN for this workspace." The agent asks again before it uses either secret.',
  rationale:
    'A note names only a change of the facts of the session. So a removed pre-approval gives no note to a session that a secret for all agents or an approval of the session still covers. A removed approval of a session gives a note only in that session, such as "removed the approval of PROD_DATABASE_URL for this session", as app/capabilities/changed/several shows.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'capabilities-changed-removed' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
