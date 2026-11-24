import { defineUseCase } from '@mokly/mokly'

export const openAPreviewOnAPhone = defineUseCase({
  title: 'Open a preview on a phone',
  description:
    'Cal presses a port in the Preview tool of the phone app. The in-app browser opens over the app on the page of the authorizer, which redeems a one-use grant, and then shows the page of the server.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  steps: [
    {
      screenPath: 'phone-app/browser/tool',
      title: 'Press a port',
      description:
        'The Preview tool of the phone app lists the services and the servers, with no page in a frame. Cal presses port 3000 of web.',
    },
    {
      screenPath: 'phone-app/browser/opening',
      title: 'The browser opens',
      description:
        'The phone app asks the server for a launch with a new grant. The in-app browser opens over the app on the page of the authorizer, which shows "Opening preview".',
    },
    {
      screenPath: 'phone-app/browser',
      title: 'The preview shows',
      description:
        'The page goes to the host of the preview and shows the checkout page of the dev server. Done closes the browser and shows the Preview tool again.',
    },
  ],
})
