import { defineUseCase } from '@mokly/mokly'

export const signUp = defineUseCase({
  title: 'Sign up',
  description:
    'A visitor of the home page signs up with GitHub, installs the GitHub App, connects an agent, and creates the first org.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'marketing',
      title: 'Start free with GitHub',
      description:
        'The home page shows the app and its features. Both actions lead to the GitHub sign-in.',
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
      title: 'Connect Claude or Codex',
      description:
        'Back from GitHub, the install shows as done. The new user connects their own Claude or OpenAI account.',
    },
    {
      screenPath: 'app/sign-in/get-started/connected',
      title: 'Create the first org',
      description: 'Claude is connected, and Create org opens the form.',
    },
    {
      screenPath: 'app/orgs/new/first',
      title: 'Name it and choose repositories',
      description:
        'The user names the org and adds the repositories that its workspaces use.',
    },
    {
      screenPath: 'app/orgs/empty',
      title: 'The org opens',
      description: 'New workspace starts the first workspace.',
    },
  ],
})
