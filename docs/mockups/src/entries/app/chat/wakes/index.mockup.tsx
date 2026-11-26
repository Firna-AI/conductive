import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatWakes = defineScreen({
  title: 'Woken by a watched turn',
  description:
    'Address autocomplete, the first session of Checkout address autocomplete, gave the debounce of the address lookups to a new session with a workspace tool, and watched the turn of that session. Its agent then ended its reply, so the session waited with no turn. The watched turn finished, so a line of the app wakes the session: a bell, "A turn finished in", and the session chip of Debounce the address lookups to 250 ms, with the label and the state mark of its workspace. The line starts a new turn, which acts for Cal, who set the watch. The new turn reads the watched session. The line is not a message of a member, so it has no bubble, and it stays in view when the work of its turn folds. A press on the chip shows the watched session. On a phone the chip moves under the words whole.',
  rationale:
    'Cal chose option C of watch decision 1 on 20 November 2026: a watch call wakes the calling session when the watched turn finishes, fails, or stops. Watch decision 6 B adds the end reason of that turn, in the words of the app, when its end names one. The line of a late secret answer is the precedent for a line of the app that starts a turn (secrets decision 10 B). The words come before the chip, as "Stopped from" comes before the chip of a stop from a session (decision 279), because the title of a session often reads as a command. The end comes first, so it stays on the first line when the chip wraps, and a screen reader hears it before the chip. The chip names the workspace, so the line names no workspace in words. One bell marks each end, because the icon of a stop or of an error would read as an end of a turn of this session. The agent of the woken session and the copy of a transcript get the same words, with the session link in place of the chip.',
  relatedDocs: [
    'docs/protocol/session-calls.md',
    'docs/protocol/secret-late-answers.md',
  ],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'wake-finished', banner: 'none' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'The watched turn failed',
      description:
        'The watched turn failed. The line says "A turn failed in" and shows the chip. It shows no error, because the text of an error can be long, and the watched session shows it. The new turn read that session, and its answer gives the cause and asks whether to send the task again. The work of the new turn folds into one line, and the line of the wake stays in view above it. The composer is ready for the next message.',
      rationale:
        'Watch decision 6 B keeps raw errors in the watched session, where the agent reads them.',
      props: { conversation: 'wake-failed' },
    },
    {
      slug: 'stopped',
      title: 'The watched turn stopped',
      description:
        'A member pressed Stop in Debounce the address lookups to 250 ms. The line says "A turn stopped in" and shows the chip. It names no member, because the stop line of the watched session names who stopped its turn. The new turn reads that session.',
      rationale:
        'An end reason is a cause other than the end of the reply, such as the time limit of background work. Who stopped a turn is not one, so the line leaves it to the watched session.',
      props: { conversation: 'wake-stopped' },
    },
    {
      slug: 'other-workspace',
      title: 'A session of another workspace',
      description:
        'Address autocomplete asked the session of Saved carts to fill a restored address and to wait for the checks of its branch, and watched that turn. The checks still ran at the time limit of background work, so the turn of Saved carts finished with an end reason. The line says "A turn finished in", then the session chip of Saved carts, with W-402, the label of the other workspace, and its state mark. The end reason follows after a dot: "Background work stopped at the time limit". The new turn reads that session.',
      rationale:
        'The end reason has the words of the end of a turn at the time limit of background work, as `app/chat/background-limit` shows them. A dot separates it from the chip, as the notes of a stop line follow its words. The chip names the other workspace, so the line needs no other words for it.',
      props: { conversation: 'wake-other-workspace' },
    },
    {
      slug: 'during-turn',
      title: 'A wake during a turn',
      description:
        'Cal asked for a test of an address without a postcode after the hand-off, and the turn of that message runs. The watched turn finished while it ran, so the line joins the running turn as a new part, as a message during a turn does. The turn keeps its sender. Its earlier tool calls show as one closed run, and its newest run shows the read of the watched session.',
      rationale:
        'A late secret answer joins a running turn in the same way. The line starts no second turn, so the session runs one turn at a time.',
      props: { conversation: 'wake-during-turn' },
    },
  ],
})
