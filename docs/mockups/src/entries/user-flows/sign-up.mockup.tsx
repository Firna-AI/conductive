import { defineUseCase } from '@mokly/mokly'

export const signUp = defineUseCase({
  title: 'Sign up',
  description:
    'A visitor of the home page signs up with GitHub, installs the GitHub App, creates the first org, adds its Boat key, and connects an agent.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'marketing',
      title: 'Start free with GitHub',
      description:
        'The home page shows the app and its features, and says that users need their own Boat account, which runs the cloud computers. Both actions lead to the GitHub sign-in.',
    },
    {
      screenPath: 'app/sign-in',
      title: 'Continue with GitHub',
      description:
        'GitHub signs the visitor in, and the first sign-in creates the account.',
    },
    {
      screenPath: 'app/sign-in/get-started',
      title: 'Install the GitHub App',
      description:
        'The new user installs the GitHub App on the account that owns their repositories.',
    },
    {
      screenPath: 'app/sign-in/get-started/installed',
      title: 'Create the first org',
      description:
        'Back from GitHub, the install shows as done, and Create org opens the form.',
    },
    {
      screenPath: 'app/orgs/new/first',
      title: 'Name it and choose repositories',
      description:
        'The user names the org and adds the repositories that its workspaces use.',
    },
    {
      screenPath: 'app/sign-in/get-started/org-created',
      title: 'Add the Boat key',
      description:
        'The user makes an API key in their own Boat account and pastes it. The app tests it once.',
    },
    {
      screenPath: 'app/sign-in/get-started/key-saved',
      title: 'Connect Claude or Codex',
      description:
        'The key passed its test. The user pastes a Claude subscription token, or connects Codex.',
    },
    {
      screenPath: 'app/sign-in/get-started/connected',
      title: 'Every step is done',
      description: 'Open Firna leads to the new org.',
    },
    {
      screenPath: 'app/orgs/empty',
      title: 'The org opens',
      description: 'New workspace starts the first workspace.',
    },
  ],
})
