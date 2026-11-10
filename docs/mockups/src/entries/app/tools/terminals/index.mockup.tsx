import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const terminalTabs = defineScreen({
  title: 'One terminal',
  description:
    'A workspace starts with one terminal, Terminal 1, here running the dev server. Its tab has no close button, because the Terminal tool always keeps a terminal. The + at the end of the row opens Terminal 2.',
  rationale:
    'The user chose terminal tabs in the Terminal tool on 10 November 2026 (decision 248). The row shows also with one terminal, so the + to open another is always in the same place. To get a new shell in the last terminal, the user ends the shell with exit, and the next connection opens a new one.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'running',
    banner: 'none',
    tool: 'terminal',
    terminals: 'one',
    focus: 'tool',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'limit',
      title: 'Ten terminals',
      description:
        'A workspace holds up to 10 terminals. At the tenth, the + is off, and a line under the row says how to open another. The row scrolls sideways and shows the new Terminal 10.',
      rationale:
        'The user chose a limit of 10 terminals for each workspace on 10 November 2026 (decision 249). The line is text, not a hover tip, so a phone shows it too.',
      props: { terminals: 'limit' },
    },
    {
      slug: 'close',
      title: 'Close a terminal',
      description:
        'The close button of Terminal 2 asks first, because the close ends its shell and any running command, such as a dev server, for everyone in the workspace. Desktop shows a dialog, and a phone shows a sheet. After the close, the tool shows the terminal before it.',
      props: { terminals: 'several', overlay: 'close-terminal' },
    },
    {
      slug: 'open-failed',
      title: 'A terminal did not open',
      description:
        'When the + cannot open a terminal, the toast of a failed change names it, with the message of the server. The row keeps its terminals, and the + opens a terminal again.',
      props: { terminals: 'several', overlay: 'terminal-open-failed' },
    },
    {
      slug: 'close-failed',
      title: 'A terminal did not close',
      description:
        'When a close fails, the toast names the terminal, with the message of the server. The terminal keeps its tab and its shell, and its close button tries again.',
      props: { terminals: 'several', overlay: 'terminal-close-failed' },
    },
  ],
})
