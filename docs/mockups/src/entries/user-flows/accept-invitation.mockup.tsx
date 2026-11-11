import { defineUseCase } from '@mokly/mokly'

export const acceptInvitation = defineUseCase({
  title: 'Accept an org invitation',
  description:
    'Cal, an admin of Acme, invites the email of a person who has no account yet. The person opens the invitation email, signs in with GitHub, and accepts the invitation, which also gives app access. Acme then opens.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'emails/invitation',
      title: 'Open the invitation email',
      description:
        'The email names Cal, Acme, and what Conductive does. Accept invitation opens the app, and the line under it names the GitHub account to sign in with.',
    },
    {
      screenPath: 'app/sign-in',
      title: 'Continue with GitHub',
      description:
        "Sam signs in with the GitHub account that has the invited email verified. The first sign-in creates Sam's account, without app access.",
    },
    {
      screenPath: 'app/sign-in/waitlist/invited',
      title: 'Accept the invitation',
      description:
        'Sam has no app access, so the waitlist shows the invitation of Acme. Accept invitation joins Acme and gives app access in the same step.',
    },
    {
      screenPath: 'app/shell',
      title: 'Acme opens',
      description: 'The workspace list of Acme opens.',
    },
  ],
})
