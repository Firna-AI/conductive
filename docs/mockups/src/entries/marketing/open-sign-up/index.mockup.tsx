import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../brand'
import { MarketingScreen } from '../../../screens/MarketingScreen'

export const marketingOpenSignUp = defineScreen({
  title: 'Open sign-up',
  description:
    'The home page while an operator has turned off the waitlist and sign-ups are not paused. The main action reads Start free with GitHub in the header, the hero, the last call to action, and the footer. Both actions still lead to the GitHub sign-in, and the rest of the page stays the same.',
  rationale:
    'The user chose option A of decision 230 on 9 November 2026. During open sign-up each sign-in gets app access at once, so the main action promises use at once, with the words from before the waitlist. At all other times the site says Join the waitlist, also when the Worker cannot read the switch, because that default promises less. The site keeps the switch for up to 60 seconds, so the words can change up to a minute after the switch. The home page has child pages and shows only its canonical screen, so this state is a child page.',
  relatedDocs: [],
  address: productDomain,
  props: {},
  useCasePaths: ['user-flows/open-sign-up'],
  render: (_props, context) => (
    <MarketingScreen signUp="open" viewport={context.viewport} />
  ),
})
