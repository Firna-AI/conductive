import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const severalMixedValue = defineScreen({
  title: 'A secret and a missing name, with a value',
  description:
    'Cal typed the value of MAPBOX_TOKEN and kept 15 minutes, so Allow is on. On a phone, Give a value opened the sheet with the field, the choice, the line about PROD_DATABASE_URL, and Allow.',
  rationale:
    'Moved here from a saved state of the Two secrets page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'secret-waiting-mixed-value',
    overlay: 'value-sheet',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
