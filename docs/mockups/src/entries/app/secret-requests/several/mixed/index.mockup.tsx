import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const severalMixed = defineScreen({
  title: 'A secret and a missing name',
  description:
    'The agent compares Mapbox on addresses from production, so it names PROD_DATABASE_URL, a secret of Acme, and MAPBOX_TOKEN, which Acme does not have. The card names both, says what each is, and gives the reason. On a computer, the field named MAPBOX_TOKEN and one choice of how long the value lasts follow, and a line says that Allow also allows PROD_DATABASE_URL for this session. On a phone the card shows Deny and Give a value.',
  rationale:
    'Item 7 A of the mockups: one answer covers a request with mixed names. Each secret of the org gets the approval of the session, each missing name gets its own value field, and one choice of how long covers every value. One task keeps one card. Moved here from a saved state of the Two secrets page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'secret-waiting-mixed' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
