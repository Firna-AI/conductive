import { defineScreen } from '@mokly/mokly'
import { OfflineScreen } from '../../../screens/OfflineScreen'

export const phoneAppOffline = defineScreen({
  title: 'Offline',
  description:
    'The phone app started without a connection, so it has nothing to show. A full page says that the app is offline, with Try again, before or after a sign-in. Try again starts the app again, which opens the workspace list of a person who is signed in. When the connection drops later, the app keeps the page that it shows, and each view shows the failure that it shows in a browser, such as a list that did not load. The desktop view shows the phone app on a tablet, in the desktop layout.',
  rationale:
    'An agent call of 23 November 2026 that commits the app to the least: the full page shows only when the app has no data to show. A drop after the start needs no new state, because each view of the web app already shows a server that it cannot reach. The page has no foot, because the legal pages cannot open without a connection.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  props: {},
  render: (_props, context) => <OfflineScreen viewport={context.viewport} />,
})
