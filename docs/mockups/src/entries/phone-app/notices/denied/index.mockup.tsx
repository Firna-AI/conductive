import { defineScreen } from '@mokly/mokly'
import { PhoneApp } from '../../../../components/phone/PhoneApp'
import { AccountScreen } from '../../../../screens/AccountScreen'
import {
  deniedPreferences,
  phonePreferences,
  phonePreferencesSchema,
} from '../../../../screens/phonePreferences'

export const phoneNoticesDenied = defineScreen({
  title: 'Notices off',
  description:
    'Cal answered Don’t Allow, so the system keeps the notices of the app off, and the app cannot ask again. The Preferences tab of the Account page of the phone app starts with the Notices section: what the notices are for, the state Off, the line that the notices are off in the settings of this device, and Open device settings, which opens the page of the app in the settings of the phone. Favourites and New workspaces follow, as in the web app. The desktop view shows the same tab on a tablet.',
  rationale:
    'After a denial only the settings of the phone can turn the notices on, so the section names that place and gives the one action that opens it. The words say "device", because a tablet shows the same section. The web app and the Mac app get no push notices (decision 1 F of the Expo app plan), so they show no Notices section. The section comes first, because it is the one setting of the tab that only the phone apps have, and so a phone shows it without a scroll. The page marks the phone apps, so the Preferences tab opens the page of the same notices setting. Keyboard shortcuts shows with no link, because the phone apps have no page for it yet. The controls of the page offer only the notices and the states that Preferences shares with the web app, so no control draws a tab of the web app inside the phone apps.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  propSchema: phonePreferencesSchema,
  props: deniedPreferences,
  render: (props, context) => (
    <PhoneApp>
      <AccountScreen
        state={phonePreferences(props)}
        viewport={context.viewport}
      />
    </PhoneApp>
  ),
  variants: [
    {
      slug: 'not-now',
      title: 'Not now',
      description:
        'Cal answered Not now to the ask of the app, so the system has not asked yet. The section shows Off and Turn on notices, which opens the alert of the system over Preferences, as phone-app/notices/system/preferences shows.',
      rationale:
        'Not now does not use the one alert of the system, so the app can still show it from here. The section has no line, because the state and the action say all that the person needs.',
      props: { notices: 'not-now' },
    },
    {
      slug: 'on',
      title: 'On',
      description:
        'The notices are on. The section shows On, the line that the settings of this device change them, and Open device settings.',
      rationale:
        'The app offers no choice of events (decision 2 A, not option C), and only the settings of the phone turn the notices off, so the section gives that place.',
      props: { notices: 'on' },
    },
  ],
})
