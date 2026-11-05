import { defineUseCase } from '@mokly/mokly'

export const upgrade = defineUseCase({
  title: 'Upgrade to Team',
  description:
    'The owner of a free org reaches its member limit, chooses the seats of Team on the billing tab, pays on Stripe Checkout, and comes back to the org on Team.',
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
      title: 'Choose the seats',
      description:
        'The owner chooses 3 seats, checks the price and the compute, agrees to the terms, and continues to the payment on Stripe.',
    },
    {
      screenPath: 'app/org-settings/billing/upgraded',
      title: 'The org is on Team',
      description:
        'Back from Stripe Checkout, the billing tab shows Team with its seats, and the owner invites the members.',
    },
  ],
})
