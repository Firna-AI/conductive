import { defineUseCase } from '@mokly/mokly'

export const mentionAFile = defineUseCase({
  title: 'Mention a file',
  description:
    'The user points the agent at a file and a folder of the workspace with `@`, and opens the file from the sent message.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/file-mentions',
      title: 'Type @',
      description:
        'In Checkout address autocomplete, the user types `@addr`. The list of the files and folders of the workspace opens above the message box, with the best matches first.',
    },
    {
      screenPath: 'app/file-mentions/chips',
      title: 'Pick a file and a folder',
      description:
        'Enter picks the highlighted file, and the text shows it as a chip. The user picks a folder in the same way.',
    },
    {
      screenPath: 'app/file-mentions/chips/sent',
      title: 'Send',
      description:
        'The message shows both chips. The agent gets the paths inside the repository, reads the file, and moves the lookup.',
    },
    {
      screenPath: 'app/files/code',
      title: 'Open the file',
      description:
        'The file has a kept tab, so a press on the file chip shows that tab, as a press in All files does.',
    },
  ],
})
