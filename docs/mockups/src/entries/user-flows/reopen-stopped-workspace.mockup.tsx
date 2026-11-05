import { defineUseCase } from '@mokly/mokly'

export const reopenStoppedWorkspace = defineUseCase({
  title: 'Reopen a stopped workspace',
  description:
    'The user comes back to a workspace whose sandbox stopped after a time without use.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/shell',
      title: 'Find the workspace',
      description:
        'Checkout address autocomplete shows as stopped in the Checkout section.',
    },
    {
      screenPath: 'app/shell/starting',
      title: 'Open it',
      description:
        'Opening the workspace resumes its sandbox. The chat history shows at once.',
    },
    {
      screenPath: 'app',
      title: 'Keep working',
      description:
        'The sandbox is ready. The tools open, and the user sends the next message.',
    },
  ],
})
