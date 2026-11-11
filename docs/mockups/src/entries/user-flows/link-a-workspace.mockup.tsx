import { defineUseCase } from '@mokly/mokly'

export const linkAWorkspace = defineUseCase({
  title: 'Link a workspace',
  description:
    'The user points the agent of one workspace at another workspace of the org, with its link, which shows as a chip.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/workspace-links/copy-link',
      title: 'Copy the link',
      description:
        'In Saved carts, the user presses W-402 in the header. It copies the link of the workspace, and a note says "Link copied".',
    },
    {
      screenPath: 'app/workspace-links/messages',
      title: 'Paste it in another workspace',
      description:
        'In Checkout address autocomplete, the user pastes the link into the message. It becomes a chip at once: the list mark, W-402, and Saved carts.',
    },
    {
      screenPath: 'app/workspace-links/messages/sent',
      title: 'Send',
      description:
        'The message shows the chip. The agent gets the plain link, and it starts to work.',
    },
    {
      screenPath: 'app/workspace-links',
      title: 'Read the answer',
      description:
        'The answer shows each link to a workspace of the org as a chip, with the state of the workspace now.',
    },
    {
      screenPath: 'app/new-workspace/first-turn',
      title: 'Open the linked workspace',
      description:
        'A press on the chip of Saved carts opens that workspace, where the agent still works on the first message.',
    },
  ],
})
