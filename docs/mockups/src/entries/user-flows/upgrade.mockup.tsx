import { defineUseCase } from '@mokly/mokly'

export const upgrade = defineUseCase({
  title: 'Upgrade to Team',
  description:
    'The owner of a free org reaches its member limit, checks the price of Team on the billing tab, pays on Stripe Checkout, and comes back to the org on Team.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/org-settings/members/free',
      title: 'Invite a member',
      description:
        'A free org has one member, its owner, so the invite leads to Upgrade.',
    },
    {
      screenPath: 'app/org-settings/billing/upgrade',
      title: 'Check the price',
      description:
        'The owner checks the price for the 1 member of the org, the compute, and the tax, agrees to the terms, and continues to the payment on Stripe.',
    },
    {
      screenPath: 'app/org-settings/billing/upgraded',
      title: 'The org is on Team',
      description:
        'Back from Stripe Checkout, the billing tab shows Team with 1 seat, and the owner invites the members. Each invite adds a seat when the person accepts it.',
    },
  ],
})
