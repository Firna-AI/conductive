import { defineUseCase } from '@mokly/mokly'

export const createOrg = defineUseCase({
  title: 'Create an org',
  description:
    'The user adds an org beside the ones they have, with its own repositories and workspaces.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/shell',
      title: 'Choose Create org',
      description: 'The rail lists the orgs, with Create org at the end.',
    },
    {
      screenPath: 'app/orgs/new',
      title: 'Name it and choose repositories',
      description:
        'The user names the org and adds the repositories that its workspaces use.',
    },
    {
      screenPath: 'app/orgs/empty/another',
      title: 'The org opens',
      description:
        'The rail adds and selects the new org, and the first build of its cloud computer starts. New workspace waits for that build, then starts the first workspace.',
    },
  ],
})
