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
        'The chat shows the command just above the composer, and that it waits for approval on the Mac.',
    },
    {
      screenPath: 'mac-app/commands/notification',
      title: 'macOS notifies',
      description:
        'The Mac app is in the background, so a notification opens the workspace.',
    },
    {
      screenPath: 'mac-app/commands',
      title: 'Allow the command',
      description:
        'The request waits above the composer with the command, the time limit, Deny, and Allow. Details shows the folder, the reason, the workspace, and the sender.',
    },
    {
      screenPath: 'app/mac-commands/done',
      title: 'The output goes back',
      description: 'The command ran, and the agent reads its output.',
    },
  ],
})
