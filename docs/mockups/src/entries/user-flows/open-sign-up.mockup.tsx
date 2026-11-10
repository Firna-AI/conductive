import { defineUseCase } from '@mokly/mokly'

export const openSignUp = defineUseCase({
  title: 'Open sign-up',
  description:
    'While an operator has turned off the waitlist, a visitor of the home page signs up with GitHub and gets app access at once. Get started opens, with no waitlist.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'marketing/open-sign-up',
      title: 'Sign up',
      description:
        'The waitlist is off. The home page stays the same, and Sign up leads to the GitHub sign-in.',
    },
    {
      screenPath: 'app/sign-in',
      title: 'Continue with GitHub',
      description:
        'GitHub signs the visitor in. The first sign-in creates the account, and open sign-up gives it app access at once.',
    },
    {
      screenPath: 'app/sign-in/get-started',
      title: 'Get started',
      description:
        'The app opens Get started, with no waitlist. The Join with an invite link flow shows its next steps.',
    },
  ],
})
