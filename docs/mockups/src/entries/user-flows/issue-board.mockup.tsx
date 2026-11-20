import { defineUseCase } from '@mokly/mokly'

export const issueBoard = defineUseCase({
  title: 'Start an issue from the board',
  description:
    'Variation D: the person drags a card to In progress, and the workspace starts at once.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/issues/board',
      title: 'Open the board',
      description:
        'Cal opens Issues. The cards show the live state of their workspaces.',
    },
    {
      screenPath: 'app/issues/board/drop',
      title: 'Drag to In progress',
      description:
        'Cal drags I-31 to In progress. The column says that the drop starts a workspace.',
    },
    {
      screenPath: 'app/issues/board/live',
      title: 'The card works',
      description: 'The card is in In progress, and its workspace mark runs.',
    },
    {
      screenPath: 'app/issues/board/workspace',
      title: 'Open the workspace',
      description:
        'The card opens the workspace. The Issue tab of the right column shows the checklist.',
    },
  ],
})
