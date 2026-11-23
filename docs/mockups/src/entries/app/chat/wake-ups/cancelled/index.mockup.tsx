import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const cancelledWakeUp = defineScreen({
  title: 'A cancelled wake-up',
  description:
    'Priya pressed Cancel on the pending wake-up of the session of Cal. Its card left the footer, and a line of the app takes its place in the chat, in her local time: "You cancelled the wake-up for tomorrow at 10:00". Cancel asks no question first, as Stop asks none. The wake-up starts no turn.',
  rationale:
    'Cal chose B of wake-up decision 5 on 23 November 2026: a Cancel adds a line that names the member, as a stop line does. The line names the wake-up by its time, as its card did, because a session can have several wake-ups.',
  relatedDocs: [
    'docs/protocol/wake-ups-chat.md',
    'docs/protocol/session-transcripts.md',
  ],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'wake-up-cancelled',
    viewer: 'member',
    banner: 'none',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'others',
      title: 'As the others read it',
      description:
        'Cal reads the same line with the name of Priya, in his local time: "Priya Raman cancelled the wake-up for tomorrow at 09:00".',
      props: { viewer: 'admin' },
    },
    {
      slug: 'one-of-three',
      title: 'One of three',
      description:
        'Priya cancelled the wake-up of tomorrow, one of the three that the agent set. The line names it by its time, and the cards of the two others stay above the composer.',
      props: { conversation: 'wake-up-cancelled-one' },
    },
    {
      slug: 'left-org',
      title: 'A member who left the org',
      description:
        'Jonas cancelled the wake-up, and then left Acme. The line names no member: "The wake-up for tomorrow at 09:00 was cancelled".',
      rationale:
        'A stop by a member who left the org names nobody, so a Cancel does the same.',
      props: { conversation: 'wake-up-cancelled-left', viewer: 'admin' },
    },
    {
      slug: 'from-session',
      title: 'From a session',
      description:
        'The agent of the second session of Checkout address autocomplete, Debounce the address lookups to 250 ms, read the checks of #482 itself. Then it cancelled the wake-up of Address autocomplete with a workspace tool. No member pressed Cancel, so the line names no member. Cal reads it in his local time: "Wake-up tomorrow at 09:00 · Cancelled from", then the session chip of the second session. The second session still works, so the workspace and the mark of the chip show that it works. A press on the chip shows that session. On a phone the line wraps into two balanced lines, and the chip moves to the second line whole, as in the line of a wake. When the agent of Address autocomplete cancels its own wake-up, the line is the same, with the chip of Address autocomplete.',
      rationale:
        'Wake-up decision 5 B records a Cancel as a stop line does. Decision 279 gives a stop through the workspace tools "Stopped from" and the session chip of the sending session, so a cancel through the tools gives "Cancelled from" and that chip. The line names the wake-up first, by the title of its card, because a session can have several wake-ups. The words come before the chip, because the title of a session often reads as a command. The copy of a transcript gives the session link in place of the chip.',
      props: { conversation: 'wake-up-cancelled-from', viewer: 'admin' },
    },
  ],
})
