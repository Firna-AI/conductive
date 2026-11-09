import { defineUseCase } from '@mokly/mokly'

export const openWorkspaceFromPalette = defineUseCase({
  title: 'Open a workspace from the palette',
  description:
    'The user finds a workspace by its name and opens it without the mouse.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/shell',
      title: 'Open the palette',
      description:
        'Cal presses ⌘K, or chooses Search under New workspace in the list.',
    },
    {
      screenPath: 'app/command-palette',
      title: 'See the recent workspaces',
      description:
        'The palette opens on the All tab. The workspace that Cal wants is not among the recent ones.',
    },
    {
      screenPath: 'app/command-palette/search',
      title: 'Search',
      description:
        'Cal types "check". Checkout address autocomplete is the first result, and Enter opens it.',
    },
    {
      screenPath: 'app/shell/starting',
      title: 'Open it',
      description:
        'The workspace was stopped, so its sandbox resumes. The chat history shows at once.',
    },
    {
      screenPath: 'app',
      title: 'Keep working',
      description: 'The sandbox is ready, and Cal sends the next message.',
    },
  ],
})
