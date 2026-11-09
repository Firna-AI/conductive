import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatWork = defineScreen({
  title: 'Open work of a turn',
  description:
    'The user opened the folded work of the finished turn. It lists its steps in order, one line each: each tool call as in an open run of tool calls, and each message with its first words. The user opened the second message, so its line grows to the full text. The answer and the end of the turn stay under the work.',
  rationale:
    'The user chose B of decision 150 on 8 November 2026: when a turn ends, the work before its answer folds into one line, as in Conductor. A long message shows one line until a click opens it, so the other steps stay close together. The tool calls show as call lines, not as folds inside the fold, so one click shows each call. The fold keeps its choice while the chat shows it. When it opens, its line stays in place and its list opens below it, so a phone shows the line and the first steps.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, fold: 'open-message', banner: 'checks-running' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'steered',
      title: 'Message during a turn',
      description:
        'While the agent worked, the user asked for a debounce. The message joined the turn and started a new part of it. When the turn ended, each part folded its own work and kept its own answer in view: the progress that the user read before the message, then the final answer.',
      rationale:
        'The runner answers a message during a turn in the same turn. So each answer stays in view beside the message that it answers, as the chat shows each result with the messages that it answers. A fold of all the work before the last answer was rejected, because it hides the first answer.',
      props: { conversation: 'steered', fold: 'closed' },
    },
    {
      slug: 'mac-command',
      title: 'Mac command and lost data',
      description:
        'The work of a finished turn holds a command that ran on the Mac of Cal and a tool update that was lost. Both folded with the work at their place, and the line of the fold counts only the tool call and the messages. The user opened the fold, so the card of the command and the lost line show among the steps.',
      rationale:
        'The user chose A of decision 151 on 9 November 2026: a Mac command card and a lost line of the turn fold with its work at their place. They add no count and no mark to the line of the fold.',
      props: { conversation: 'mac-in-work', fold: 'open' },
    },
  ],
})
