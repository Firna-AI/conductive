import { defineUseCase } from '@mokly/mokly'

export const archiveFromList = defineUseCase({
  title: 'Archive a workspace from the list',
  description:
    'The user archives a finished workspace from its row, without opening it, and brings it back with Restore.',
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
        'A right click on the row opens its menu at the pointer. The menu keys open it too.',
    },
    {
      screenPath: 'app/workspace-menu/archive',
      title: 'Archive at once',
      description:
        'Archive takes the workspace from its section to the Archived group, with no check and no question. A toast names it and offers Restore, and the list stays where it was.',
    },
    {
      screenPath: 'app/workspace-menu/archive/restored',
      title: 'Restore',
      description:
        'Restore in the toast puts the workspace back in its section, at its place, stopped.',
    },
  ],
})
