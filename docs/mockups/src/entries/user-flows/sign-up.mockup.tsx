import { defineUseCase } from '@mokly/mokly'

export const signUp = defineUseCase({
  title: 'Sign up',
  description:
    'A visitor of the home page signs up with GitHub and joins the waitlist. The account waits for app access until an operator approves it, or an invite code or an org invitation lets the person in.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'marketing',
      title: 'Sign up',
      description:
        'The home page shows the app and its features. Sign up leads to the GitHub sign-in.',
    },
    {
      screenPath: 'app/sign-in',
      title: 'Continue with GitHub',
      description:
        'GitHub signs the visitor in. The first sign-in creates the account, without app access.',
    },
    {
      screenPath: 'app/sign-in/waitlist',
      title: 'Wait for app access',
      description:
        'Sam is on the waitlist. An invite code or an org invitation lets Sam in at once. An approval sends an email, and the app then opens Get started, whose steps the Join with an invite link flow shows.',
    },
  ],
})
