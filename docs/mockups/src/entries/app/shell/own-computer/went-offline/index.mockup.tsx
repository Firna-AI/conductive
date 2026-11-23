import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { computerPaths } from '../../../../../computerPaths'
import { ownComputerPages } from '../../../../../screens/ownComputerPages'
import { workspaceStateSchema } from '../../../../../screens/workspaceState'

export const ownComputerWentOffline = defineScreen({
  title: 'Computer went offline',
  description:
    'Checkout address autocomplete was open on lab-server when lab-server lost its connection. For 2 minutes the workspace kept its state, then it showed stopped. The bar says that the sandbox stopped. Its saved message says that lab-server went offline, and that Resume starts the workspace when lab-server connects again. Resume leads to the resume that waits for lab-server. All files and Changes keep the lists that the workspace saved.',
  rationale:
    'Cal chose option B of own computer decision 10 on 23 November 2026: a grace time of 2 minutes, then the stopped state. When an own computer loses its connection, its running workspaces keep their state for 2 minutes. Then each shows the stopped state, and its saved message says that the computer went offline. A short network gap then ends no work, and no new state of a workspace is needed. A resume waits for the computer, as a start on an offline computer does. Not chosen: A, stopped at once. C, a new "Computer offline" state with the containers still running.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: ownComputerPages[computerPaths.workspace.wentOffline],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'during-turn',
      title: 'Went offline during a turn',
      description:
        'The same stop while the agent worked. The turn kept running on lab-server during the 2 minutes, and it ended with the stop. The running tool call shows as stopped, and the chat says "The agent stopped", with no member. The bar stays the same. Resume leads to the resume that waits for lab-server with this chat, as the stopped-turn variant of the waiting page shows.',
      rationale:
        'A turn that stops with no Stop request shows "The agent stopped", as the chat protocol says. The stop of the computer of the workspace is such a stop. The app stops the container when lab-server connects again. Resume keeps every other part of the workspace, so the stopped turn stays in the chat (review finding 2, 23 November 2026).',
      props: ownComputerPages[computerPaths.workspace.wentOfflineDuringTurn],
    },
  ],
})
