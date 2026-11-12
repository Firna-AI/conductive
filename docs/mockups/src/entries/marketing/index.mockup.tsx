import { defineScreen } from '@mokly/mokly'
import { productDomain, productName } from '../../brand'
import { MarketingScreen } from '../../screens/MarketingScreen'

export const marketing = defineScreen({
  title: 'Marketing site',
  description:
    'The marketing home page, public at the root of the product domain: a header with Download, Sign in, and Sign up, a hero with the app and the actions Sign up and Download for Mac, six features with real screens, the Mac app with a download for Apple silicon and one for Intel, the smaller features, a last call to action with the same actions, and a footer with a link to the Mac app. The child page open-sign-up shows the same page while the waitlist is off.',
  rationale: `The page follows the calm structure of a Conductor-style home page: a short headline with one sentence, then large product pictures. Every picture is a real screen of this catalogue, laid out at its own size, scaled, and cropped, with its links and controls turned off, so a visitor stays on the page. Each claim is one that the plan decides. The page shows no customer logos, testimonials, user counts, certifications, native mobile app, API, other agents, or changelog posts, and its footer links the changelog page. The Mac app of decision 62 has its own section, as the user chose on 8 November 2026: a real screen of the Mac app with a command that waits, a download for each chip, and the oldest macOS version, so that a visitor with an older Mac does not download a DMG that does not open. Apple silicon comes first, because most current Macs have it. Each download names a DMG with a fixed name in the latest release, because the site runs no script to find the newest version. The page shows no plans, because the pricing page shows them, and the desktop header and the footer link to it. Its main action is Sign up, and its second action is Download for Mac, as the user chose on 10 November 2026, so no button names the waitlist. Download for Mac leads to the Mac app section, not to one DMG, because the site runs no script to pick the chip of the visitor. The sentence under the last call to action says that the app opens when the account gets access, so the page promises no use at once. The words stay true during open sign-up, when the sign-in gives app access at once, so the page stays the same in both states. The app runs every cloud computer on its own account, so the page asks for no other account, as the user chose in decision 80. The product is "${productName}", on ${productDomain}, as the user chose in decision 100.`,
  relatedDocs: [],
  address: productDomain,
  props: {},
  useCasePaths: ['user-flows/sign-up'],
  render: (_props, context) => <MarketingScreen viewport={context.viewport} />,
})
