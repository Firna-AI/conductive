import { defineUseCase } from '@mokly/mokly'

export const openALocalServer = defineUseCase({
  title: 'Open a local server',
  description:
    'The user opens a server of the cloud computer from the local address that an agent gives in its answer.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/chat/links/local-address',
      title: 'Read the answer',
      description:
        'In Checkout address autocomplete, the agent answers with the address of the dev server, http://localhost:3000. The address is a link.',
    },
    {
      screenPath: 'app/tools/preview',
      title: 'Open the preview',
      description:
        'A press on the address opens the Preview tool of the workspace, with the preview of port 3000 in its frame. On a phone, the Preview tool takes the place of the chat.',
    },
  ],
})
