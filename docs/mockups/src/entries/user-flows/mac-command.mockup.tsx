import { defineUseCase } from '@mokly/mokly'

export const macCommand = defineUseCase({
  title: 'Run a command on a Mac',
  description:
    'An agent in the cloud asks to run a command on the Mac of the person who sent the message, and that person allows it in the Mac app.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/mac-commands',
      title: 'The agent asks',
      description:
        'The chat shows the command, and that it waits for approval on the Mac.',
    },
    {
      screenPath: 'mac-app/commands/notification',
      title: 'macOS notifies',
      description:
        'The Mac app is in the background, so a notification opens the prompt.',
    },
    {
      screenPath: 'mac-app/commands',
      title: 'Allow the command',
      description:
        'The prompt shows the command, the folder, the reason, the time limit, the workspace, and the sender.',
    },
    {
      screenPath: 'app/mac-commands/done',
      title: 'The output goes back',
      description: 'The command ran, and the agent reads its output.',
    },
  ],
})
