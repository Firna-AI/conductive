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
      description: 'The workspace list has New workspace at the top.',
    },
    {
      screenPath: 'app/new-workspace',
      title: 'Fill in the form',
      description:
        'The user picks the repository and the agent, names the workspace, and writes the first message.',
    },
    {
      screenPath: 'app/new-workspace/creating',
      title: 'The workspace opens',
      description:
        'The workspace opens at once while its sandbox starts. The first message waits for the sandbox.',
    },
    {
      screenPath: 'app/new-workspace/first-turn',
      title: 'The agent starts',
      description: 'The sandbox is ready, and the agent works on the message.',
    },
  ],
})
