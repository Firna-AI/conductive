import { defineUseCase } from '@mokly/mokly'

export const issueOneList = defineUseCase({
  title: 'Start an issue in the workspace list',
  description:
    'Variation B: an issue waits in the list as a workspace that has not started, then Start turns it into the workspace.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/issues/one-list/new',
      title: 'Save a task as an issue',
      description:
        'In New workspace, Save as issue keeps a task in the list with no cloud computer.',
    },
    {
      screenPath: 'app/issues/one-list',
      title: 'Open an issue',
      description:
        'Cal chooses I-31 in Checkout. It opens with its brief and a message box with Start.',
    },
    {
      screenPath: 'app/issues/one-list/workspace',
      title: 'Start it',
      description:
        'Start turns the row into a workspace in the same place. The issue is the first tab.',
    },
    {
      screenPath: 'app/issues/one-list/brief',
      title: 'Check the brief',
      description:
        'The issue tab shows the checklist, which the agent ticks as it works.',
    },
  ],
})
