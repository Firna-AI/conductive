import { defineUseCase } from '@mokly/mokly'

export const mergeAndContinue = defineUseCase({
  title: 'Merge and continue',
  description:
    'A member merges a pull request from the bar, then moves the workspace on to the next task, with the same sandbox and sessions.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/banner/checks/ready-to-merge',
      title: 'Merge',
      description:
        'Every check passed, and a reviewer approved. Cal presses Squash and merge.',
    },
    {
      screenPath: 'app/banner/merge',
      title: 'The merge runs',
      description:
        'The button shows that the merge runs until GitHub reports the result.',
    },
    {
      screenPath: 'app/banner/checks/merged',
      title: 'Merged',
      description:
        'The bar shows the merge, with Continue and Archive. Cal presses Continue.',
    },
    {
      screenPath: 'app/banner/continue/running',
      title: 'Continue runs',
      description:
        'The sandbox has no local work, so Continue starts at once and creates a new branch from the latest main.',
    },
    {
      screenPath: 'app/banner/continued',
      title: 'The next task',
      description:
        'The bar starts again on the new branch, and the session notes the change. Cal sends the next message.',
    },
  ],
})
