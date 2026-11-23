import { defineScreen } from '@mokly/mokly'
import {
  InAppBrowserScreen,
  inAppBrowserSchema,
} from '../../../../screens/InAppBrowserScreen'

export const phoneBrowserDesktop = defineScreen({
  title: 'Desktop stream',
  description:
    'The live desktop of the cloud computer, where the agent uses a browser, open in the in-app browser: the bar with Done and a host on the preview domain, then the stream on a dark page. The desktop keeps its shape, so a phone shows it across the width, and a tablet shows it larger. This page keeps a design for the return of Desktop: the app hides Desktop from every user while its stream is not reliable, as app/tools/desktop says, so no tool opens this page today.',
  rationale:
    'A design call of the Expo app plan of 23 November 2026: the desktop stream opens in the in-app browser, as previews do. The plan asks to draw the stream, and the app hides it, so the page shows the design that Desktop gets when it returns. Today the server gives the stream an address of the provider of the cloud computer, with a token that works for 10 minutes, not a grant of 60 seconds. The browser would show the host of that address, and no screen names a provider. So the bar shows a host on the preview domain, which stands for an address of the app that a later decision sets.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  propSchema: inAppBrowserSchema,
  props: { page: 'desktop' },
  render: (props, context) => (
    <InAppBrowserScreen state={props} viewport={context.viewport} />
  ),
})
