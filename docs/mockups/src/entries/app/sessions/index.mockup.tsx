import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const sessions = defineScreen({
  title: 'Sessions',
  description:
    'A new session, after + at the end of the tabs: an empty chat with its own model picker. It works on the same branch and the same cloud computer as the two other sessions.',
  rationale:
    'Each agent session is a tab in the centre column, beside the open files and diffs. The current session shows a pencil to rename it, and every tab closes. The user chose several sessions per workspace, each with its own model picker, in decision 19. On a phone the sessions are tabs at the top of the Chat tab. The clock after + opens the session history, as the user chose in decision 31.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, tab: 'new-session' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'history',
      title: 'Session history',
      description:
        'The clock after + opens the sessions whose tabs the user closed, the last closed first. Each row shows the mark of the agent of its last message, the title, the time since it closed, and the arrow that reopens it as a tab with its chat. On a phone the history is a sheet.',
      props: { tab: 'session', overlay: 'history' },
    },
    {
      slug: 'close',
      title: 'Close a running session',
      description:
        'The user closes the tab of a session whose turn runs. The app asks first, because closing stops the turn. The session then moves to the history. On a phone the question is a sheet.',
      props: {
        tab: 'session',
        conversation: 'running',
        banner: 'none',
        overlay: 'close-session',
      },
    },
  ],
})
