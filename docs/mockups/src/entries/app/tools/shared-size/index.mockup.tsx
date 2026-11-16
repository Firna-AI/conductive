import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const terminalSharedSize = defineScreen({
  title: 'A size that another viewer set',
  description:
    'Another viewer of Terminal 1, with a larger panel, typed last, so the terminal has the size of that panel. This viewer shows the whole screen in smaller text, with the same line breaks as the other viewer. When the user types here, this panel sets the size, and the text gets its normal size again.',
  rationale:
    'The user chose the control-mode bridge on 13 November 2026, as decision 1 of the terminal control-mode bridge change. The bridge passes the raw output of the shell, so all viewers of a terminal must share one size. A new connection, or the viewer where the user last typed or resized, sets that size, as tmux does today. The screen shows no notice, because tmux shows none today either.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'running',
    banner: 'none',
    tool: 'terminal',
    terminals: 'shared-larger',
    focus: 'tool',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'smaller',
      title: 'A smaller size',
      description:
        'Another viewer with a smaller panel, such as a phone, typed last. This viewer shows the screen at that size, and empty space follows it. A thin line marks the edge of the shared size.',
      rationale:
        'The shared size keeps the line breaks right for every viewer. Larger text would not help, because the shell writes its lines for the shared size.',
      props: { terminals: 'shared-smaller' },
    },
  ],
})
