import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../brand'
import { pricingPlans } from '../../../../../../src/marketing/pricing'
import { PricingScreen } from '../../../screens/PricingScreen'

export const pricing = defineScreen({
  title: 'Pricing',
  description: `The pricing page, at /pricing, with the header and the footer of the site. The header marks Pricing as the current page. The top says that the product stays free until billing starts and that nobody pays until they choose a plan. Then come the ${pricingPlans.length} plans as quiet boxes, each with its price, what the price covers, and what it includes, and one line under them: the prices are monthly, in US dollars, and exclude VAT and sales tax. How cloud hours count follows: the size of each cloud computer, one pool for the org, every minute of every cloud computer, the stop after 30 minutes, and the extra hours. The last call to action has Sign up and Download for Mac, with the sentence that a new account waits for access. A desktop shows the plans side by side, and in two columns below 1000 px. A phone stacks them. The desktop header and the Product column of the footer link here.`,
  rationale:
    'The user chose the plans, the prices, the hours, and the price of an extra hour on 10 November 2026, and the tax line on the same day. The plans, the numbers, and the words come from the module of the site in src/marketing/pricing.ts, so the page and this mockup show the same content. The prices exclude tax, and the tax line says nothing about checkout, because no checkout adds the tax by itself. The page sells nothing yet, so no plan has a button, and the actions are the actions of the site. No plan is marked as the best choice, because no decision names one. The hours rules name every use that counts, such as image builds and the short restarts near day 14 of a stop, so that a bill never surprises an org. Each hour has a round price, and no text names the provider of the cloud computers. The phone header keeps Docs, GitHub, and Sign in, so a phone reaches the page from the Product column of the footer.',
  relatedDocs: [],
  address: `${productDomain}/pricing`,
  props: {},
  render: (_props, context) => <PricingScreen viewport={context.viewport} />,
})
