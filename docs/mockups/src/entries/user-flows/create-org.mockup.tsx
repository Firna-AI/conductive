import { defineUseCase } from '@mokly/mokly'

export const createOrg = defineUseCase({
  title: 'Create an org',
  description:
    'The user adds an org beside the ones they have, with its own repositories and workspaces. The user already owns a free org, so the new org starts on Team.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/shell',
      title: 'Choose Create org',
      description: 'The rail lists the orgs, with Create org at the end.',
    },
    {
      screenPath: 'app/orgs/new',
      title: 'Name it and pay for Team',
      description:
        'The user names the org and adds its repositories. The user already owns a free org, so the new org starts on Team, and Continue to payment opens Stripe Checkout.',
    },
    {
      screenPath: 'app/orgs/empty/team',
      title: 'The org opens',
      description:
        'Back from Stripe Checkout, the rail selects the new org. New workspace starts its first workspace.',
    },
  ],
})
