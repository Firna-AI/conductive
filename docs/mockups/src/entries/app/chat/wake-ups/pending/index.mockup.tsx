import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const pendingWakeUps = defineScreen({
  title: 'Pending wake-ups',
  description:
    'Cal asked for three later steps, London time, and the agent set three wake-ups: today at 18:30, tomorrow at 09:00, and Monday 30 November at 09:00. The cards stand soonest first, each with its time, Cancel, and two lines of its text. A day after tomorrow shows its weekday and its date. The group takes at most 30% of the window, and more cards scroll inside it.',
  rationale:
    'Wake-up decision 2 A: each wake-up starts one turn, so three later steps are three wake-ups. Soonest first puts the next wake-up at the top of the group. Each card has its own Cancel, because a member can keep one wake-up and end another.',
  relatedDocs: ['docs/protocol/background-work.md'],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'wake-ups-pending',
    banner: 'none',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'long',
      title: 'A long text',
      description:
        'The agent set a wake-up for 00:30, after the staging address provider resets its rate limit, with a text of two paragraphs. The card shows two lines of the text, which end in an ellipsis. A press on the text shows all of it.',
      rationale:
        'The text of a wake-up follows the rules of the text of a tool message, so it can be long. Two lines keep the card small above the composer, and the press opens the text as a message line in the work of a turn opens.',
      props: { conversation: 'wake-up-long' },
    },
    {
      slug: 'open',
      title: 'The whole text',
      description:
        'After a press on the text, the card shows all of it, with its line break and its code, as a message shows them. A second press shows two lines again.',
      props: { conversation: 'wake-up-long-open' },
    },
    {
      slug: 'stopped',
      title: 'The cloud computer stopped',
      description:
        'The session had no turn for a while, so its cloud computer stopped. The bar with Resume takes the place of the composer, and the card of the wake-up stays above the bar. At its time, the wake-up starts the cloud computer and a turn, as app/chat/wake-ups/fired/starting shows.',
      rationale:
        'A pending wake-up holds no turn, so it keeps no cloud computer running. That is why the Worker keeps the wake-ups, from wake-up decision 1.',
      props: { conversation: 'wake-up-pending', sandbox: 'stopped' },
    },
    {
      slug: 'member',
      title: 'Another member',
      description:
        'Priya opens the session of Cal. She sees the same card, with its time in her own local time, in Berlin: "Wake-up tomorrow at 10:00". She can press Cancel too.',
      rationale:
        'Wake-up decision 3 B gives Cancel to each member. A member who may stop a turn of the session may cancel its wake-ups.',
      props: { conversation: 'wake-up-pending', viewer: 'member' },
    },
  ],
})
