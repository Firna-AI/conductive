import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const sessions = defineScreen({
  title: 'Sessions',
  description:
    'A new session, after + at the end of the tabs: an empty chat with its own model picker. It has no title yet, so its tab says Untitled until its first message with text. It works on the same branch and the same cloud computer as the two other sessions. The user started it, so its composer says "Uses your Claude login".',
  rationale:
    'Each agent session is a tab in the centre column, beside the open files and diffs. The current session shows a pencil to rename it, and every tab closes. The user chose several sessions per workspace, each with its own model picker, in decision 19. On a phone the sessions are tabs at the top of the Chat tab. The clock after + opens the session history, as the user chose in decision 31. The user chose option C of decision 143 on 8 November 2026: the first session takes the name of the workspace, and each other session takes its first message. So the title of each other session is the first line of its first message, cut at a word boundary to at most 60 characters. The user chose option G of decision 144 and option B of decision 147 on 9 November 2026. A new session has no title and shows Untitled. An automatic title fills only an empty title, so a name that a member set never changes. A session whose first message has no text stays Untitled until a message with text. The tab shortens a long title on screen. The empty chat and + still say New session, because they name the action, not the session.',
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
        'The clock after + opens the sessions whose tabs the user closed, the last closed first. Each row shows the mark of the agent of its last message, the title, the time since it closed, and the arrow that reopens it as a tab with its chat. Each title is the first line of the first message of its session, and the row shortens a long title. The oldest session has only a screenshot and no text, so it has no title and shows Untitled. On a phone the history is a sheet.',
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
    {
      slug: 'no-starter-login',
      title: "Starter's login not available",
      description:
        'Cal started Address autocomplete, then removed the Claude login from the account. Priya opens the session, whose chat stays as it was, and writes a message. The notice over the composer says that the message starts a new session. The line under the composer says "Uses your Claude login". Send opens the new session.',
      rationale:
        "The user chose option A of decision 115 on 7 November 2026. When the starter's login cannot be used, another member's message starts a new, empty session on that member's own login. Examples are a starter who left the org or removed the login. The first session stays as it was. The notice shows before Send, so the member knows where the message goes. Cal sees the notice that asks to connect Claude, as the Agent not connected state of the composer shows.",
      props: { tab: 'session', viewer: 'member', composer: 'no-starter-login' },
    },
    {
      slug: 'linked',
      title: 'Linked session',
      description:
        'The message of Priya opened a new session as the last tab. The title of the tab is the first line of that message, cut at a word boundary to 60 characters. The session starts empty. It holds a line that links back to Address autocomplete, then the message, and the agent works on it. It runs on the Claude login of Priya, its starter.',
      rationale:
        'The user chose option A of decision 115 on 7 November 2026: a new, empty session with a link to the first session, not a copy of its chat. The link line uses the style of the other event lines of the chat: centred, muted, and with an icon. Other members see "Uses Priya Raman\'s Claude login" under the composer of this session.',
      props: {
        viewer: 'member',
        tab: 'linked-session',
        conversation: 'linked',
      },
    },
  ],
})
