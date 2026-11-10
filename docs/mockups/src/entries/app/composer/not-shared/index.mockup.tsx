import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const loginNotShared = defineScreen({
  title: 'Login not shared',
  description:
    'Cal started Address autocomplete, and the switch under the Claude login of Cal is off. The turn of Cal runs. Priya opens the session and writes a message. The notice over the composer says that the message starts a new session, because the Claude login of Cal is for the messages of Cal only. The bar names no login, because the message runs on the own login of Priya. Stop still ends the turn of Cal, and the message does not steer it. Send opens the new session, as app/sessions/linked shows.',
  rationale:
    'Option B of decision 116, which the user chose on 7 November 2026: each login has a switch that lets other members use it, off for a Claude subscription and on for an API key. A message of another member in a session whose starter keeps the login starts a new, empty session on the login of that member, as decision 115 A says. The session record says whether the starter shares the login, so the notice shows before Send. When Priya has no Claude login, the notice that asks to connect takes its place, as the Agent not connected state shows, and Send is off. Cal sees no notice in this session, because it runs on the own login of Cal. Moved here from a saved state of the Composer page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    viewer: 'member',
    composer: 'not-shared',
    conversation: 'running',
    banner: 'none',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
