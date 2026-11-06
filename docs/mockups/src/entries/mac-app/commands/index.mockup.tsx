import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../screens/MacAppScreen'

const flow = ['user-flows/mac-command']

export const macCommands = defineScreen({
  title: 'Device commands',
  description:
    'An agent in the cloud asks to run a command on this Mac. The Mac app asks first: it shows the command, the folder, the reason, the time limit, the workspace, and the sender. Deny stands apart from Always allow, Allow all commands for 15 minutes, and Allow.',
  rationale:
    'The user asked that the Mac app registers the Mac as a device, and that each command needs permission, with these choices (decision 62). The request goes to the Mac of the person who sent the turn, because each turn runs on its sender login (decision 49). The command runs with the permissions of the user, with an output limit.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: { window: 'window', page: 'workspace', command: 'prompt' },
  useCasePaths: flow,
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'long-limit',
      title: 'Longer time limit',
      description:
        'The agent asks for 10 minutes for the whole Safari suite. The prompt shows why the agent asks for more than the usual limit.',
      rationale:
        'A command gets 60 seconds by default and 120 at most. A longer limit, up to 30 minutes, needs a reason, which the prompt shows (decision 62).',
      props: { command: 'prompt-long' },
    },
    {
      slug: 'notification',
      title: 'Notification',
      description:
        'The Mac app is in the background, so its window buttons are grey, and macOS shows a notification at the top right. The notification opens the prompt.',
      props: { command: 'notification' },
      useCasePaths: flow,
    },
    {
      slug: 'allow-all',
      title: 'All commands for 15 minutes',
      description:
        'After Allow all commands for 15 minutes, a bar at the top of the workspace says that every command from it runs on this Mac without asking. It counts down the time left and offers Stop. The command ran, and the chat shows its output.',
      rationale:
        'The 15 minutes cover one workspace on this Mac, as decision 62 says. The amber bar keeps the open permission in view.',
      props: { command: 'allow-all' },
    },
  ],
})
