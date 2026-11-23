import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const capabilitiesMenu = defineScreen({
  title: 'The menu of a phone',
  description:
    'On a phone, the bar of the composer holds one + button in place of the paperclip and the Capabilities icon. Its menu opens above it with Attach files and Capabilities. Capabilities opens the control as a sheet, and Attach files opens the file picker. A computer keeps the paperclip and the Capabilities icon in the bar, so its view shows the composer as it is.',
  rationale:
    'Secrets decision 16 G: on a phone, Stop shows only its icon, and Attach files and Capabilities move into one menu. Only this keeps the model and the login label readable at 360 px. Attaching a file takes two taps, and the menu gives later tools of the composer a place on a phone. Moved here from a saved state of the Capabilities page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'menu' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
