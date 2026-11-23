import { defineUseCase } from '@mokly/mokly'

export const openANotice = defineUseCase({
  title: 'Open a notice',
  description:
    'An agent in Checkout address autocomplete asks for a secret while the phone of Cal is locked. Cal opens the notice, and the phone app shows the workspace with the request, where he can answer it.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  steps: [
    {
      screenPath: 'phone-app/lock-screen',
      title: 'A notice comes',
      description:
        'The newest notice on the lock screen names Checkout address autocomplete and says Needs a secret. It holds no agent text. Cal presses it and unlocks the phone.',
    },
    {
      screenPath: 'app/secret-requests',
      title: 'The request waits',
      description:
        'The phone app opens the workspace at the chat. The request for PROD_DATABASE_URL waits just above the composer, with Deny and Allow for this session, and the workspace shows Needs input.',
    },
  ],
})
