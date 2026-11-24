import { defineScreen } from '@mokly/mokly'
import {
  InAppBrowserScreen,
  inAppBrowserSchema,
} from '../../../../screens/InAppBrowserScreen'

export const phoneBrowserTerms = defineScreen({
  title: 'Terms in the in-app browser',
  description:
    'Terms from the sign-in of the phone app, open in the in-app browser of the system over the app. The Terms links of the agreement and of the foot of the sign-in open this page. The bar holds Done, the host of the app with the lock of a secure page, and Reload. The page shows the shared terms, as the Terms page of the site does, with no header or footer of the site and no wordmark link. So no link of the page leads to the home page or the pricing page. Done closes the browser and shows the stage of the sign-in that opened the page. The catalogue links the page only from the start of the sign-in, so its Done shows the start.',
  rationale:
    'A design call of the Expo app plan of 23 November 2026: the phone apps open Terms and Privacy on pages of the app host, which show the shared legal text with no site header, no site footer, and no wordmark link. The legal pages of the site show its header and footer, which link to the pricing page, and the phone apps show no pricing. The page reads the same text as the site, so a new revision of the terms reaches the phone apps at once, also an old copy of the app.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  propSchema: inAppBrowserSchema,
  props: { page: 'terms' },
  render: (props, context) => (
    <InAppBrowserScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'privacy',
      title: 'Privacy in the in-app browser',
      description:
        'The Privacy notice from the sign-in of the phone app, in the same page of the app host. The Privacy links of the agreement and of the foot of the sign-in open it. Done shows the start of the sign-in again, as on Terms.',
      props: { page: 'privacy' },
    },
  ],
})
