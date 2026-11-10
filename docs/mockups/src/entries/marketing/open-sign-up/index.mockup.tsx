import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../brand'
import { MarketingScreen } from '../../../screens/MarketingScreen'

export const marketingOpenSignUp = defineScreen({
  title: 'Open sign-up',
  description:
    'The home page while an operator has turned off the waitlist and sign-ups are not paused. The page stays the same as at all other times, with Sign up as its main action. Sign up leads to the GitHub sign-in, which gives app access at once in this state.',
  rationale:
    'Every main action of the site reads Sign up, and no button names the waitlist, as the user chose on 10 November 2026. That choice replaces the words of open sign-up from option A of decision 230. The sentence under the last call to action says that the app opens when the account gets access, which is true in both states. So the site reads no state of sign-up, and its words stay the same after each change of the switch. The Open sign-up flow starts on this page.',
  relatedDocs: [],
  address: productDomain,
  props: {},
  useCasePaths: ['user-flows/open-sign-up'],
  render: (_props, context) => <MarketingScreen viewport={context.viewport} />,
})
