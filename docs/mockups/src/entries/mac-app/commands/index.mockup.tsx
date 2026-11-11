import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../screens/MacAppScreen'

const flow = ['user-flows/mac-command']

export const macCommands = defineScreen({
  title: 'Device commands',
  description:
    'An agent in the cloud asks to run a command on this Mac. The request waits in the chat as a compact message, just above the composer: the exact command, the time limit, Deny, and Allow. Details opens the folder, the reason, the workspace, and the sender. The arrow beside Allow opens Always allow and Allow all commands for 15 minutes. The workspace list shows Needs input.',
  rationale:
    'The user asked that the Mac app registers the Mac as a device, and that each command needs permission, with these choices (decision 62). The user then asked for a compact message in the chat instead of a dialog, with the command and its actions (decision 62). The request goes to the Mac of the person who sent the turn. The agent login belongs to the starter of the session (decision 105), but Mac requests stay with the sender of the turn. The command runs with the permissions of the user, with an output limit.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'prompt',
    change: 'none',
  },
  useCasePaths: flow,
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'more-choices',
      title: 'More ways to allow',
      description:
        'The arrow beside Allow opens the other two choices, each with what it covers. Always allow covers this exact command on this Mac. Allow all commands for 15 minutes covers every command from this workspace on this Mac.',
      rationale:
        'Deny and Allow stay in view, and the less common choices keep their exact scopes from decision 62. A view runs no script, so the arrow is a native disclosure, and each choice links to its result.',
      props: { command: 'choices' },
    },
    {
      slug: 'long-limit',
      title: 'Longer time limit',
      description:
        'The agent asks for 10 minutes for the whole Safari suite. The request shows why the agent asks for more than the usual limit, under the time limit.',
      rationale:
        'A command gets 60 seconds by default and 120 at most. A longer limit, up to 30 minutes, needs a reason, which the request shows without a click (decision 62).',
      props: { command: 'prompt-long' },
    },
    {
      slug: 'notification',
      title: 'Notification',
      description:
        'The Mac app is in the background, so its window buttons are grey, and macOS shows a notification at the top right. The notification opens the workspace, where the request waits above the composer.',
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
