import { defineUseCase } from '@mokly/mokly'

export const addOwnComputer = defineUseCase({
  title: 'Add an own computer',
  description:
    'Cal, an admin of Acme, adds a Linux server as the own computer build-03. Its first build starts at its first connection, and workspaces can start on it when that build succeeds.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/org-settings/own-computers/add',
      title: 'Name the computer',
      description:
        'Add computer on the Own computers tab opens the dialog. Cal names the server build-03.',
    },
    {
      screenPath: 'app/org-settings/own-computers/add/command',
      title: 'Run the install command',
      description:
        'Cal copies the one-line command with its one-time code and runs it on the server. The dialog waits for the first connection.',
    },
    {
      screenPath: 'app/org-settings/own-computers/add/connected',
      title: 'The computer connects',
      description:
        'build-03 connected and reported its size, so it runs up to 4 workspaces at once. Its first build starts.',
    },
    {
      screenPath: 'app/org-settings/own-computers',
      title: 'build-03 builds',
      description:
        'Done shows the list, where build-03 builds the setup of Acme. New workspace offers it when that build succeeds.',
    },
  ],
})
