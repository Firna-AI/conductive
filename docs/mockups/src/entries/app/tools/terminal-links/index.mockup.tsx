import { defineScreen } from '@mokly/mokly'
import { reportHost } from '../../../../fixtures/terminal'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const terminalLinks = defineScreen({
  title: 'A link in the terminal',
  description:
    'The mouse pointer is on the local address of the dev server. The address shows an underline and the hint "⌘-click to open". On Windows and Linux the hint says "Ctrl+click to open". A ⌘-click opens the Preview tool at port 3000, as a click on a detected server does. Any other web address opens in a new browser tab. A phone shows no underline and no hint, because it has no pointer. A tap on a link opens it there.',
  rationale:
    'The user chose on 13 November 2026 that a local address opens the preview of its port, and that every other address opens in the browser, as terminal links decision 1 B. The user chose ⌘-click, or Ctrl+click off a Mac, as decision 2 A, because a plain click starts a selection. A ⌘-click off a link still goes to a program that has the mouse, such as tmux. The user chose a tap on a touch screen, with the underline on hover, as decision 3 D.',
  relatedDocs: [],
  useCasePaths: ['user-flows/open-a-terminal-link'],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'running',
    banner: 'none',
    tool: 'terminal',
    terminals: 'link',
    focus: 'tool',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'labelled',
      title: 'A link with a label',
      description: `A test reporter prints a link as the label "Open the HTML report". The hint names the host of its real address, ${reportHost}, before the ⌘-click.`,
      rationale:
        'A program can print a link whose label hides where it leads, as an OSC 8 link. The user chose on 13 November 2026 that its hint names the real host, as terminal links decision 4 B. The browser dialog that xterm.js showed before was rejected, because it adds a step to each such link.',
      props: { terminals: 'labelled-link' },
    },
  ],
})
