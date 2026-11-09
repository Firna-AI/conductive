import { defineUseCase } from '@mokly/mokly'

export const join = defineUseCase({
  title: 'Join with an invite link',
  description:
    'A person opens an invite link that someone shared, signs in with GitHub, and the code of the link lets them in. Get started then installs the GitHub App, creates the first org, and connects an agent.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/sign-in/join',
      title: 'Open the invite link',
      description:
        'The link opens the sign-in with its invite code. Continue with GitHub agrees to the terms and signs the person in.',
    },
    {
      screenPath: 'app/sign-in/get-started',
      title: 'Install the GitHub App',
      description:
        'The code gave app access, so Get started opens. The new user installs the GitHub App on the account that owns their repositories.',
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
      title: 'Connect Claude or Codex',
      description:
        'The org is created, and its cloud computer is being prepared. The org step shows the time of the build. The user pastes a Claude subscription token, or connects Codex.',
    },
    {
      screenPath: 'app/sign-in/get-started/preparing',
      title: 'Every step is done',
      description:
        'The cloud computer is still being prepared. Open Firna leads to the new org.',
    },
    {
      screenPath: 'app/orgs/empty',
      title: 'The org opens',
      description: 'New workspace starts the first workspace.',
    },
    {
      screenPath: 'app/new-workspace/first-build',
      title: 'Wait for the cloud computer',
      description:
        'The user types the task. A notice shows the time of the build, and Send stays off until the cloud computer is ready.',
    },
    {
      screenPath: 'app/new-workspace/first-build/ready',
      title: 'The cloud computer is ready',
      description:
        'The notice goes, and Send is on. Send creates the first workspace.',
    },
  ],
})
