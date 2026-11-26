import { defineUseCase } from '@mokly/mokly'

export const stopAService = defineUseCase({
  title: 'Stop a service',
  description:
    'The user stops web, the dev server that an agent started as a service, from the Preview tool.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/tools/services',
      title: 'See the services',
      description:
        'In Checkout address autocomplete, the Preview tool lists web, storybook, and worker above the servers. web runs on port 3000, whose Preview tab shows.',
    },
    {
      screenPath: 'app/tools/services/menu',
      title: 'Open the menu of web',
      description:
        'The menu button of web opens Restart and Stop. On a phone the menu is a sheet.',
    },
    {
      screenPath: 'app/tools/services/stop',
      title: 'Confirm the Stop',
      description:
        'Stop asks "Stop web?", because the stop ends web for everyone in the workspace.',
    },
    {
      screenPath: 'app/tools/services/stop/stopping',
      title: 'The Stop runs',
      description: 'The row of web shows Stopping…, and its menu is off.',
    },
    {
      screenPath: 'app/tools/services/stop/stopped',
      title: 'web is stopped',
      description:
        'The row shows Stopped. The Preview tab of port 3000 stays, and Restart can run web again.',
    },
  ],
})
