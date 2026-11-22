import { defineUseCase } from '@mokly/mokly'

export const readAFailedServiceLog = defineUseCase({
  title: 'Read the log of a failed service',
  description:
    'The user finds out why storybook stopped, from its row and its log.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/tools/services/ended/memory',
      title: 'See the failed service',
      description:
        'The row of storybook shows Failed and Out of memory. web and worker keep running.',
    },
    {
      screenPath: 'app/tools/services/log/memory',
      title: 'Read its log',
      description:
        'The scroll icon of storybook shows the end of its log. The output stops where the cloud computer ran out of memory. Close shows the list again.',
    },
  ],
})
