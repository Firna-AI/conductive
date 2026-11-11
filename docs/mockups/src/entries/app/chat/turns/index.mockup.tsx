import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatTurns = defineScreen({
  title: 'Running turn',
  description:
    'The agent works: the current run of tool calls shows each call, and the elapsed time shows. Stop sits beside Send, and the composer steers the turn. The agent loaded a skill in the current run, so a skill line, "Used skill testing", shows at its place among the calls. The earlier run folded, and its line names the skill that it loaded: "4 tool calls · Skill: brainstorming".',
  rationale:
    'A turn runs, takes guidance, stops, or fails. Its work folds only when it ends, so the user sees each step while the agent works. The user chose B of decision 277 on 11 November 2026: each skill that the agent loads shows as a skill line among the tool calls, with a book icon and the skill name. Each fold line names the skills of its calls, so the name stays in view when a run folds. The words "Used skill" come from A of decision 279. Moved here from the chat page, which now shows only its canonical screen beside its child pages.',
  relatedDocs: [],
  movedFrom: 'app/chat/running',
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'skills-running', banner: 'none' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'steer',
      title: 'Steer while running',
      description:
        'The user types more guidance while the turn runs. Send adds it to the running turn, where it starts a new part, as `app/chat/work/steered` shows after the turn ends. No hint appears below the message box, so it keeps its place.',
      movedFrom: 'app/chat/steer',
      props: { conversation: 'steer' },
    },
    {
      slug: 'interrupted',
      title: 'Interrupted',
      description:
        'The user pressed Stop, so the chat says "You stopped the agent". Other members see the name of the user, from decision 72. The work before the last message of the agent folds into one line. That message and the tool calls after it stay in view, and the call that the stop cut off shows as stopped. The composer is ready for the next message.',
      rationale:
        'A stopped turn keeps the last words of the agent and the calls that the stop cut off in view, because the user needs them to write the next message. A fold of all the work of a turn that ends with a tool call was rejected, because it hides where the turn stopped.',
      movedFrom: 'app/chat/interrupted',
      props: { conversation: 'interrupted' },
    },
    {
      slug: 'failed',
      title: 'Turn failed',
      description:
        'The turn stopped with an error from the model provider. The work before the last message of the agent folds into one line, and that message and the tool calls after it stay in view. The error names the cause, and Try again retries the turn.',
      movedFrom: 'app/chat/failed',
      props: { conversation: 'failed' },
    },
  ],
})
