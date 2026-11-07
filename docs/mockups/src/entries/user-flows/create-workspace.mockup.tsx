import { defineUseCase } from '@mokly/mokly'

export const createWorkspace = defineUseCase({
  title: 'Create a workspace',
  description:
    'The user starts a new task: a workspace with its own sandbox and branch, and an agent that starts on the first message.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/shell',
      title: 'Choose New workspace',
      description:
        'New workspace sits at the top of the list, and in the menu of each section.',
    },
    {
      screenPath: 'app/new-workspace',
      title: 'Write the task',
      description:
        'An empty chat opens. The user picks the repository, writes the first message, and sends it.',
    },
    {
      screenPath: 'app/new-workspace/creating',
      title: 'The workspace opens',
      description:
        'The workspace opens at once as Lisbon, on a new branch, and joins General. The first message waits for the sandbox.',
    },
    {
      screenPath: 'app/new-workspace/waiting',
      title: 'Write more',
      description:
        'The user writes a second message. The composer keeps it, and Send waits until the sandbox is ready. The user then sends it.',
    },
    {
      screenPath: 'app/new-workspace/first-turn',
      title: 'The agent starts',
      description:
        'The sandbox is ready, and the agent works on the message. Its first answer names the workspace Saved carts.',
    },
  ],
})
