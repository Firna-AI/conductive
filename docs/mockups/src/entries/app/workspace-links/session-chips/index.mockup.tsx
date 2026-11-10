import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const sessionChips = defineScreen({
  title: 'Session chips',
  description:
    'The second session of Checkout address autocomplete, Debounce the address lookups to 250 ms. Cal asked its agent to tell the first session and Saved carts what changed. The agent sent both messages, and its answer names both sessions. Each link to a session shows as a session chip: the state mark and the label of its workspace, the icon of a session tab, and the title of the session. A Markdown link to a session shows as the chip alone. A press on a chip opens the workspace of the session and shows the session. The first session works on its message, so the workspace shows that it works. The variant shows pasted session links in the message box.',
  rationale:
    'The user chose option C of decision 259 on 10 November 2026. The label tells where the session is, also for a session of another workspace. The icon of a session tab tells a session chip from a workspace chip, whose name takes the same place. Saved carts shows why: its one session has the name of the workspace. A long title is cut short, and the chip gives the whole title as its title. A session without a title shows Untitled, as its tab does. A link to a session that the chat does not find shows the chip of its workspace, and a press opens the workspace page.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    tab: 'later-session',
    conversation: 'session-links',
    banner: 'checks-running',
  },
  useCasePaths: ['user-flows/open-a-session-link'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'pasted',
      title: 'Pasted session links',
      description:
        'In the second session, Cal pasted the links of two closed sessions into the message box. Each link became a session chip at once. The session with only a screenshot has no title, so its chip says Untitled. The postcode check has a long title, which the chip cuts short. On a phone each chip ends with a ×.',
      rationale:
        'A session chip in the message box works as a workspace chip does there. It is one unit of the text, and under a pointer the cell of its mark turns into a × that removes it. The draft keeps the plain links, so the agent gets them and can read those sessions.',
      props: { composer: 'session-link' },
    },
  ],
})
