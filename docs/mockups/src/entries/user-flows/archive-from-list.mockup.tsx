import { defineUseCase } from '@mokly/mokly'

export const archiveFromList = defineUseCase({
  title: 'Archive a workspace from the list',
  description:
    'The user archives a finished workspace from its row, without opening it.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/shell',
      title: 'Find the workspace',
      description:
        'Apple Pay button is ready in the Checkout section of the list.',
    },
    {
      screenPath: 'app/workspace-menu',
      title: 'Open its menu',
      description:
        'A right click on the row opens its menu at the pointer. On a phone, More at the end of the row opens it as a sheet.',
    },
    {
      screenPath: 'app/workspace-menu/archive',
      title: 'Answer the question',
      description:
        'Archive checks the cloud computer, then lists the work that is not on GitHub. The user chooses Archive anyway.',
    },
    {
      screenPath: 'app/workspace-menu/archive/archived',
      title: 'The row moves',
      description:
        'The workspace leaves its section for the Archived group, and the list stays where it was.',
    },
  ],
})
