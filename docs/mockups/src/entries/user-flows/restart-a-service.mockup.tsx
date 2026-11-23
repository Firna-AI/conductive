import { defineUseCase } from '@mokly/mokly'

export const restartAService = defineUseCase({
  title: 'Restart a service',
  description:
    'The user restarts web from the Preview tool, and its preview stays open.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/tools/services',
      title: 'See the services',
      description:
        'In Checkout address autocomplete, web runs next dev on port 3000, whose Preview tab shows.',
    },
    {
      screenPath: 'app/tools/services/menu',
      title: 'Open the menu of web',
      description: 'The menu button of web opens Restart and Stop.',
    },
    {
      screenPath: 'app/tools/services/restart',
      title: 'Restart runs at once',
      description:
        'Restart asks nothing. The row of web shows Restarting…, and the Preview tab stays.',
    },
    {
      screenPath: 'app/tools/services/restart/restarted',
      title: 'web runs again',
      description:
        'The row shows Running and Started just now. A Reload of the Preview tab shows the new run.',
    },
  ],
})
