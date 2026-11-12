import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatAgentStops = defineScreen({
  title: 'Stopped by an agent',
  description:
    'In Checkout address autocomplete, the agent of the second session, Debounce the address lookups to 250 ms, stopped the turn of the first session, Address autocomplete, with a workspace tool. No member pressed Stop, so the line names no member. It says "Stopped from", then the session chip of the second session: the state mark and the label of the workspace, the icon of a session tab, and the title of the session. The rest of the turn shows as after a Stop: the work before the last message of the agent folds into one line, and the call that the stop cut off shows as stopped. The second session still works, so the workspace and the mark of the chip show that it works. A press on the chip shows the second session. The composer is ready for the next message. On a phone the chip moves under the words whole. The variant shows a stop from a session of another workspace.',
  rationale:
    'The user chose option B of decision 279 on 11 November 2026: a stop by a workspace tool names the session whose agent stopped the turn, with the session chip of a "Sent by:" line. A line that names the member whose message started the turn of that agent was rejected, because members would believe that this member pressed Stop. "Stopped from" comes before the chip, as "This session started from" comes before the link of a linked session. A line that starts with the chip, such as the chip and "stopped the agent", was rejected, because the title of a session often reads as a command, such as Debounce the address lookups to 250 ms. A close of a running session by a workspace tool stops its turn with the same line, which shows when a member reopens the session from the history. A note of the turn, such as "Changed files unavailable", follows the chip after a dot, as it follows the words of a Stop. The copy of a transcript gives the same words, with the session link in place of the chip.',
  relatedDocs: [
    'docs/protocol/messages-and-attachments.md',
    'docs/protocol/session-transcripts.md',
  ],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'stopped-from', banner: 'none' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'other-workspace',
      title: 'From another workspace',
      description:
        'In Saved carts, the same agent of Checkout address autocomplete stopped the first turn during a search. The chip shows W-395, the label of the other workspace, with the state mark of that workspace. The turn of that agent goes on, so the mark and the row of that workspace show that it works. The search that the stop cut off shows as stopped. A press on the chip opens Checkout address autocomplete and shows the second session.',
      rationale:
        'The chat reads the sessions of each linked workspace when it loads, so the chip shows the title of a session of another workspace, as in a "Sent by:" line. That title does not change live, but the state mark shows the live state of the workspace. A chip of a closed session opens the page of its workspace, as each session chip does.',
      props: {
        workspace: 'saved-carts',
        conversation: 'stopped-from-other',
        banner: 'no-commits',
      },
    },
  ],
})
