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
    'In the chat of the web app, the agent asked to run a command on the Mac of Cal, who sent the message. The card names the Mac, shows the command, its folder, and its time limit, and waits for approval in the Mac app.',
  rationale:
    'The request goes to the Mac of the person who sent the turn, as decision 62 says, so the card names that Mac. Every member who opens the workspace sees the state of the command.',
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
        'The command ran on the Mac. The card shows the time that it took and its output, which went back to the agent.',
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
  ],
})
