import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const temporaryRequest = defineScreen({
  title: 'Temporary request',
  description:
    'The agent asks for MAPBOX_TOKEN, which Acme does not have. The card says that Acme has no secret with this name, and gives the reason. On a computer, the card holds the value field, the choice of how long the value lasts, with 15 minutes chosen, the line about that choice, then Deny and Allow. Allow stays off until a value is typed. On a phone, the card shows Deny and Give a value, which opens a sheet with the field, the choice, and Allow, as app/secret-requests/temporary/value shows.',
  rationale:
    'Cal added temporary requests on 13 November 2026. The person who answers types the value, then chooses how long it lasts: 15 minutes, this workspace, or Save (secrets decision 7). A value for 15 minutes serves each run of the session that asked. A value for this workspace serves each run of each session of the workspace until Archive. Neither stores an org secret. On a phone the card with the field and the choices is taller than the region of the requests, so a sheet holds them, as each phone form of the app does (item 4 C of the mockups). The states with a value and a request that outlived its tool call are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'secret-temporary' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
