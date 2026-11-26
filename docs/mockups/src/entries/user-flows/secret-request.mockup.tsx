import { defineUseCase } from '@mokly/mokly'

export const secretRequest = defineUseCase({
  title: 'Answer a secret request later',
  description:
    'An agent asks to use a secret of the org. Nobody answers in time, so the request stays above the composer as a late request. Another member allows it later, and a new turn for the member who asked tells the agent, which runs the command.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/secret-requests',
      title: 'The agent asks',
      description:
        'The card waits just above the composer with the name of the secret, its description, the reason of the agent, and the command that the agent says it will run. The tool call line of the agent runs above it. The workspace shows Needs input, and the tab of the session shows the needs-input mark.',
    },
    {
      screenPath: 'app/secret-requests/late',
      title: 'The request stays above the composer',
      description:
        'After 90 seconds the tool call ends, and the turn ends. The card stays just above the composer as a late request, with its line and its choices. The workspace keeps Needs input, and the tab keeps its mark.',
    },
    {
      screenPath: 'app/secret-requests/late/answered',
      title: 'Priya allows it later',
      description:
        'Priya opens the workspace, finds the card above the composer, and presses Allow for this session. The card takes its place in its turn. A line of the app names her and the secret, and a new turn starts for Cal, who sent the turn that asked.',
    },
    {
      screenPath: 'app/secret-requests/late/answered/ran',
      title: 'The agent runs the command',
      description:
        'The agent runs the script with the secret. Its tool call line says Running, and the card says what let it run. No value shows.',
    },
  ],
})
