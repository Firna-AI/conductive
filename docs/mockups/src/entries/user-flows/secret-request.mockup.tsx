import { defineUseCase } from '@mokly/mokly'

export const secretRequest = defineUseCase({
  title: 'Answer a secret request later',
  description:
    'An agent asks to use a secret of the org. Nobody answers in time, so the request stays in the chat. A member allows it later, and a message tells the agent, which runs the command.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/secret-requests',
      title: 'The agent asks',
      description:
        'The card waits just above the composer with the name of the secret, its description, and the reason of the agent. The workspace shows Needs input.',
    },
    {
      screenPath: 'app/secret-requests/late',
      title: 'The request stays in the chat',
      description:
        'After 90 seconds the tool call ends. The card stays as a widget at its place in the chat, and the turn ends. The workspace keeps Needs input.',
    },
    {
      screenPath: 'app/secret-requests/late/answered',
      title: 'Allow it later',
      description:
        'Cal comes back and presses Allow for this session in the widget. A message in his name says that the secret is now available, and it starts a new turn.',
    },
    {
      screenPath: 'app/secret-requests/late/ran',
      title: 'The agent runs the command',
      description:
        'The agent runs the script with the secret, and the chat hides the value in its output.',
    },
  ],
})
