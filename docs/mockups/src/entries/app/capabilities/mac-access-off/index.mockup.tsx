import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const capabilitiesMacAccessOff = defineScreen({
  title: 'Mac access off',
  description:
    'A member turned Mac access off. The switch saves at once, and the workspace refuses each later Mac command request of its agents, with a reason, as app/mac-commands/mac-access-off shows. Each session gets a note of the change in its chat, as app/capabilities/changed/several shows.',
  rationale:
    'Mac access is off by default (secrets decision 18 A), and every member changes it after the create (secrets decision 8 B). A waiting request of the workspace ends with the same reason, and a running command runs to its end. Moved here from a saved state of the Capabilities page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'capabilities-mac-off' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
