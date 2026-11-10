import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const composerLogin = defineScreen({
  title: "Another member's login",
  description:
    'Priya, a member of Acme, opens a session that Cal started, while the turn of Cal runs. Cal turned on the switch that lets other members use the Claude login. The bar of the composer box says "Cal\'s login" after the model picker. So a message of Priya spends the login of Cal, and it joins the running turn. On a phone the bar is full, so the effort of the picker gives way first, then the name, each with an ellipsis. In a session of Priya, the bar names no login.',
  rationale:
    'The user chose option F of decision 105 on 7 November 2026. Each session runs on the login of its starter, the member who started it. A message of any member uses that login. A message during a turn joins that turn at once. The composer names the login of another member, so each member sees when a message spends that login. As the user decided on 8 November 2026, the name sits in the bar, so the box keeps its place, and the own login gets no name, because it tells the user nothing new. The message needs no Claude login of Priya, so the composer shows no Connect notice. When Cal keeps the login for the messages of Cal, the composer says before Send that the message starts a new session, as the Login not shared state shows. Moved here from a saved state of the Composer page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    composer: 'attachments',
    viewer: 'member',
    conversation: 'running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
