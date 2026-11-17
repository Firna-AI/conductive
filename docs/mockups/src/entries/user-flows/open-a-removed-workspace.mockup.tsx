import { defineUseCase } from '@mokly/mokly'

export const openARemovedWorkspace = defineUseCase({
  title: 'Open a removed workspace',
  description:
    'The user opens a workspace that left the list after its 14 days, through the chip of its link in a chat.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/workspace-links',
      title: 'Find the chip',
      description:
        'The answer of the agent links Postcode lookup for the shipping and billing forms, W-372. That workspace left the list on 29 October, and its chip still shows, with the archived mark.',
    },
    {
      screenPath: 'app/archive/removed',
      title: 'Open the workspace',
      description:
        'A press on the chip opens the workspace, with its read-only chat. The bar says that it left the list and that its cloud computer is deleted. No row of the list is selected.',
    },
  ],
})
