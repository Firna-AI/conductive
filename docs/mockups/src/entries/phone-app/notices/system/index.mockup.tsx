import { defineScreen } from '@mokly/mokly'
import {
  PhoneNoticesScreen,
  phoneNoticesSchema,
} from '../../../../screens/PhoneNoticesScreen'

export const phoneNoticesSystem = defineScreen({
  title: 'Alert of the system',
  description:
    'After Turn on notices, the alert of the system lies over the whole screen: “Conductive” Would Like to Send You Notifications, the fixed line of the system under it, then Don’t Allow and Allow. Both answers close the alert and show the running turn again. After Don’t Allow, only the settings of the phone can turn the notices on, as phone-app/notices/denied shows.',
  rationale:
    'The system draws this alert and writes its words, so the page follows iOS in neutral shapes and the fonts of the catalogue, with no logo. The name in the title is the name of the app, which `productName` gives. Android draws its own alert with its own words. The app shows the alert only after its own ask, so a person who is not ready answers Not now in the app, and the app can still show the alert later.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  propSchema: phoneNoticesSchema,
  props: { view: 'system' },
  render: (props, context) => (
    <PhoneNoticesScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'preferences',
      title: 'From Preferences',
      description:
        'Cal chose Not now before. Turn on notices in the Notices section of Preferences opens the same alert over Preferences. Allow turns the notices on, as phone-app/notices/denied/on shows. Don’t Allow leaves them off in the settings of the phone, as phone-app/notices/denied shows.',
      props: { view: 'system-preferences' },
    },
  ],
})
