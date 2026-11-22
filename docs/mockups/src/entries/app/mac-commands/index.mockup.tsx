import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

const flow = ['user-flows/mac-command']

export const macCommandsInChat = defineScreen({
  title: 'Commands on a Mac',
  description:
    'In the chat of the web app, the agent asked to run a command on the Mac of Cal, who sent the message. The request waits as a compact message just above the composer: the command, the Mac, the time limit, and Details. It shows the state only, because Cal answers in the Mac app. The header and the workspace list show Needs input.',
  rationale:
    'The request goes to the Mac of the person who sent the turn, as decision 62 says, so the message names that Mac. Every member who opens the workspace sees the state of the command. Only the Mac app can allow a command on the Mac, so a browser shows no choices.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'mac-waiting' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'denied',
      title: 'Denied',
      description:
        'Cal denied the command in the Mac app. The agent goes on without it.',
      props: { conversation: 'mac-denied' },
    },
    {
      slug: 'done',
      title: 'Done',
      description:
        'The command ran on the Mac. Its card at its place in the chat shows the time that it took and its output, which went back to the agent. Long output shows its first ten lines, and its last lines fade out, with Show all under it. Show all shows the whole output, and then Show less makes it short again. When the turn ends, the card folds with the work of the turn at its place, as `app/chat/work/mac-command` shows.',
      rationale:
        'On 17 November 2026 the user asked for long output cut short with a fade and Show all, so that the output of one command does not push the rest of the chat out of view. The whole output stays in the page, so a search of the page and a copy get all of it.',
      props: { conversation: 'mac-done' },
      useCasePaths: flow,
    },
    {
      slug: 'unavailable',
      title: 'Mac not available',
      description:
        'The Mac of Cal is asleep, or the Mac app is closed. The tool tells the agent that the Mac is not available, and the agent goes on without it.',
      props: { conversation: 'mac-unavailable' },
    },
    {
      slug: 'mac-access-off',
      title: 'Mac access off',
      description:
        'An older request in the chat. Before agents could always ask, a workspace with Mac access off refused each request at once, with no question on the Mac. The card at its place says Mac access off, and its line says that Mac access is off in the Capabilities of this workspace. The tool gave the agent the same reason, and the agent went on without the Mac. No new request ends this way.',
      rationale:
        'Secrets decisions 8 B and 18 A made a workspace with Mac access off refuse each Mac command request of its agents, with a reason. Mac access decision 7 (21 November 2026) removes that refusal: agents can always ask, and the question on the Mac is the check. The chat keeps the card of a request that a workspace refused before that decision.',
      props: { conversation: 'mac-access-off' },
    },
  ],
})
