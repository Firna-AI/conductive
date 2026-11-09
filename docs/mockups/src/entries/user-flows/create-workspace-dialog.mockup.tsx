import { defineUseCase } from '@mokly/mokly'

export const createWorkspaceDialog = defineUseCase({
  title: 'Create a workspace in the dialog',
  description:
    'The user lets New workspace open as a dialog, then starts a new task from an open workspace without leaving it first.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/account/preferences',
      title: 'Choose Dialog',
      description:
        'On the Preferences tab of the account, the user chooses Dialog under New workspaces. The choice saves at once.',
    },
    {
      screenPath: 'app',
      title: 'Choose New workspace',
      description:
        'In a ready workspace, the user chooses New workspace at the top of the list.',
    },
    {
      screenPath: 'app/new-workspace/dialog',
      title: 'Write the task',
      description:
        'The dialog opens over the workspace. The user picks the repository, writes the first message, and presses Enter or Create.',
    },
    {
      screenPath: 'app/new-workspace/creating',
      title: 'The workspace opens',
      description:
        'The dialog closes, and the new workspace opens as Untitled, on a new branch, in General. About a second later, the title from the first message names it Saved carts. The first message waits for the sandbox.',
    },
  ],
})
