import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

const upgradeFlow = ['user-flows/upgrade']

export const billing = defineScreen({
  title: 'Billing',
  description:
    'Acme on Team near the end of its billing period: 3 seats, one for each member, the next invoice, and the card, then the compute of the period against the pool of its seats, a little over it, with the cost of the extra use so far. Manage payment, and Cancel plan with Withdraw from contract.',
  rationale:
    'The org pays, as the user decided on 5 November 2026: $30 a month for the seat of each member, and each seat adds $15 of compute, about 416 hours on the standard machine, to the pool of the month. The seats follow the people, so the owner buys no seat count. Use beyond the pool costs cost plus 10%. Billing is Stripe Billing with Stripe Tax, so Manage payment opens the Stripe customer portal in a new tab, which holds the card, the tax ID, and the invoices. The meter fills in one colour on a lighter track of the same colour, and turns amber over the pool, with the state in words beside it. Cancel plan and Withdraw from contract wait on decision 35, drawn as its recommended option D. The withdrawal page is not drawn yet.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'billing' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'free',
      title: 'Free',
      description:
        'Firna on Free: 3 of 3 workspaces, 1 of 1 member, the cloud computer built by hand, and the minutes of this month against the 600 that Free includes. Upgrade to Team opens the upgrade.',
      props: { billing: 'free' },
    },
    {
      slug: 'upgrade',
      title: 'Upgrade to Team',
      description:
        'The owner sees the price, which is the 1 member of the free org times $30, the pool, the price of more use, and that tax is added at payment, and agrees to the Terms and the refund and cancellation policy. Continue to payment opens Stripe Checkout, which returns here when the payment is done.',
      props: { billing: 'upgrade' },
      useCasePaths: upgradeFlow,
    },
    {
      slug: 'upgraded',
      title: 'On Team',
      description:
        'Back from Stripe Checkout: Firna is on Team with 1 seat, for its 1 member, and its first billing period, and the owner can invite members.',
      props: { billing: 'upgraded' },
      useCasePaths: upgradeFlow,
    },
  ],
})
