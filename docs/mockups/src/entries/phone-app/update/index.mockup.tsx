import { defineScreen } from '@mokly/mokly'
import { UpdateAppScreen } from '../../../screens/UpdateAppScreen'

export const phoneAppUpdate = defineScreen({
  title: 'Update the app',
  description:
    'The server refused the version of the phone app, because it is older than the minimum version. A full page of the app asks the person to update, before or after a sign-in. Update opens the page of the app in the store of the platform. The page has no other action and no foot. The desktop view shows the phone app on a tablet, in the desktop layout.',
  rationale:
    'A design call of the Expo app plan of 23 November 2026: old copies keep working, as old copies of the Mac app do, and an app below the minimum version shows Update the app. So the page shows only when the server refuses the version. Nothing else works until the update, so the page has one action. The words name no store, because each platform has its own, and the page draws no logo of a store.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  props: {},
  render: (_props, context) => <UpdateAppScreen viewport={context.viewport} />,
})
