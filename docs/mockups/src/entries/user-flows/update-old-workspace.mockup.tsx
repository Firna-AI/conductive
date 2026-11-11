import { defineUseCase } from '@mokly/mokly'

export const updateOldWorkspace = defineUseCase({
  title: 'Update an old workspace',
  description:
    'A member comes back to a workspace that stopped before a release, and before an admin changed the install script of the org.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/shell',
      title: 'Find the workspace',
      description:
        'Checkout address autocomplete shows as stopped in the Checkout section.',
    },
    {
      screenPath: 'app/workspace-updates',
      title: 'Open it',
      description:
        'The resume updates the agent and terminal software before the agent starts. The chat history shows at once.',
    },
    {
      screenPath: 'app/workspace-updates/install-script',
      title: 'See the new setup',
      description:
        'The workspace is ready. A notice says that the install script changed since the workspace started.',
    },
    {
      screenPath: 'app/workspace-updates/install-script/running',
      title: 'Run the install script',
      description:
        'The member chooses Run install script, and its output streams in the notice.',
    },
    {
      screenPath: 'app/workspace-updates/install-script/finished',
      title: 'Keep working',
      description:
        'The script finished, so the workspace has the setup of new workspaces. Dismiss closes the notice.',
    },
  ],
})
