import { defineUseCase } from '@mokly/mokly'

export const secretRequest = defineUseCase({
  title: 'Answer a secret request later',
  description:
    'An agent asks to use a secret of the org. Nobody answers in time, so the request stays in the chat. Another member allows it later, and a new turn for the member who asked tells the agent, which runs the command.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/secret-requests',
      title: 'The agent asks',
      description:
        'The card waits just above the composer with the name of the secret, its description, the reason of the agent, and the command that the agent says it will run. The tool call line of the agent runs above it. The workspace shows Needs input.',
    },
    {
      screenPath: 'app/secret-requests/late',
      title: 'The request stays in the chat',
      description:
        'After 90 seconds the tool call ends. The card stays as a widget at its place in the chat, and the turn ends. The workspace keeps Needs input.',
    },
    {
      screenPath: 'app/secret-requests/late/answered',
      title: 'Priya allows it later',
      description:
        'Priya opens the workspace and presses Allow for this session in the widget. A line of the app names her and the secret, and a new turn starts for Cal, who sent the turn that asked.',
    },
    {
      screenPath: 'app/secret-requests/late/answered/ran',
      title: 'The agent runs the command',
      description:
        'The agent runs the script with the secret. Its tool call line says Running, and the card says what let it run. No value shows.',
    },
  ],
})
