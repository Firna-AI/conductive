import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const firedWakeUp = defineScreen({
  title: 'A wake-up starts a turn',
  description:
    'At 09:00 the wake-up of the checks came. Its card left the footer, and a line of the app shows in the chat: the alarm icon, "Wake-up:", and the text that the agent set. The line starts a new turn, which acts for Cal, whose message set the wake-up. The agent reads the checks of #482. The line is not a message of a member, so it has no bubble, and it never folds into the work of its turn.',
  rationale:
    'The plan gives the agent a fixed lead and its own text, as a message with its sender line, so an older runner needs no update. One text gives these words to the chat, the agent, a copy, and read_session. The text reads a little stronger than the lead, and it shows its code as a message does. The line of a wake and the line of a late Allow are the precedents for a line of the app that starts a turn.',
  relatedDocs: [
    'docs/protocol/session-watches.md',
    'docs/protocol/secret-late-answers.md',
  ],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'wake-up-fired', banner: 'none' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'ended',
      title: 'The turn of the wake-up ended',
      description:
        'A check had failed, so the agent read its log, fixed the address form, and pushed the fix. The work of the turn folds into one line, and the line of the wake-up stays in view above it. The composer is ready for the next message.',
      props: { conversation: 'wake-up-fired-ended' },
    },
    {
      slug: 'during-turn',
      title: 'A wake-up during a turn',
      description:
        'Cal asked for a test of an address without a postcode, and the turn of that message runs. The time of the wake-up came while it ran, so the line joins the running turn as a new part, as a message during a turn does. The turn keeps its sender. Its earlier tool calls show as one closed run, and its newest run reads the checks.',
      rationale:
        'A late Allow and a wake join a running turn in the same way, so the session runs one turn at a time.',
      props: { conversation: 'wake-up-during-turn' },
    },
    {
      slug: 'starting',
      title: 'The cloud computer starts',
      description:
        'The cloud computer stopped in the night. At 09:00 the wake-up starts it, as a message does. The line of the wake-up shows at once, and the steps of the start follow it. The turn runs when the cloud computer is ready.',
      rationale:
        'A wake-up goes through the delivery of a wake, which starts a stopped cloud computer as an accepted late answer does.',
      props: { conversation: 'wake-up-starting', sandbox: 'starting' },
    },
  ],
})
