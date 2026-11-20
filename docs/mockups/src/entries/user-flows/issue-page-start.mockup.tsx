import { defineUseCase } from '@mokly/mokly'

export const issuePageStart = defineUseCase({
  title: 'Start a workspace from an issue page',
  description:
    'Variation A: the person opens an issue on the Issues page, starts a workspace from it, and returns to the issue.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/issues/page',
      title: 'Open the Issues page',
      description:
        'Cal opens Issues in the sidebar, and chooses I-31, which has no workspace yet.',
    },
    {
      screenPath: 'app/issues/page/issue',
      title: 'Read the issue',
      description:
        'The issue page shows the task, its checklist, and Start workspace in its Workspaces block.',
    },
    {
      screenPath: 'app/issues/page/start',
      title: 'Start the workspace',
      description:
        'New workspace opens, filled in from the issue. Cal presses Create.',
    },
    {
      screenPath: 'app/issues/page/workspace',
      title: 'The workspace works',
      description:
        'The workspace opens, named for the issue. The line under the header links back to I-31.',
    },
    {
      screenPath: 'app/issues/page/linked',
      title: 'Back on the issue',
      description:
        'The line opens the issue. It is In progress, and its Workspaces block shows W-403, live.',
    },
  ],
})
