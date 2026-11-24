import { defineScreen } from '@mokly/mokly'
import {
  InAppBrowserScreen,
  inAppBrowserSchema,
} from '../../../screens/InAppBrowserScreen'

export const phoneBrowser = defineScreen({
  title: 'Preview in the in-app browser',
  description:
    'Port 3000 of Checkout address autocomplete open in the in-app browser of the system, over the phone app. The bar holds Done, the host of the preview on the preview domain with the lock of a secure page, and Reload. The page of the dev server fills the rest. A phone puts Back, Forward, Share, and Open in browser in a bar at the bottom, and a tablet puts them in the top bar. Done closes the browser and shows the Preview tool again. The child pages show the Preview tool that opens the browser, the page while a preview opens, and the desktop stream.',
  rationale:
    'A design call of the Expo app plan of 23 November 2026: previews open in the in-app browser with the 60-second grant, as the Mac app opens them in the default browser. Reason: code in a preview never runs with the app session. So the phone apps show no page of a preview in a frame. The system draws the browser, so the page follows iOS in neutral shapes. Each preview has its own random host on conductive.page, and the browser shows that host.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  propSchema: inAppBrowserSchema,
  props: { page: 'preview' },
  useCasePaths: ['user-flows/open-a-preview-on-a-phone'],
  render: (props, context) => (
    <InAppBrowserScreen state={props} viewport={context.viewport} />
  ),
})
