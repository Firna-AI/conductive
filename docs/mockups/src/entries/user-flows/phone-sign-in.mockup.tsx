import { defineUseCase } from '@mokly/mokly'

export const phoneSignIn = defineUseCase({
  title: 'Sign in on a phone',
  description:
    'A person opens the phone app and signs in with GitHub in the auth session of the system, over the app. The session hands the sign-in back to the app, and the app opens on the workspace list.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  steps: [
    {
      screenPath: 'phone-app/sign-in',
      title: 'Continue with GitHub',
      description:
        'The phone app opens on the sign-in. Continue with GitHub agrees to the Terms.',
    },
    {
      screenPath: 'phone-app/sign-in/ask',
      title: 'Allow the sign-in',
      description:
        'iOS asks first, with its fixed words. Continue opens GitHub in the auth session, over the app, and the person signs in there. Android shows no alert.',
    },
    {
      screenPath: 'phone-app/sign-in/waiting',
      title: 'Finish the sign-in',
      description:
        'GitHub signed the person in, and the session closed. It handed a one-use code back to the app, which exchanges the code for its own sign-in.',
    },
    {
      screenPath: 'app/shell',
      title: 'The app opens',
      description:
        'The phone is signed in, and the app opens on the workspace list of the org.',
    },
  ],
})
