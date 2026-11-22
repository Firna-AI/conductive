import { defineUseCase } from '@mokly/mokly'

export const createWorkspaceOnOwnComputer = defineUseCase({
  title: 'Create a workspace on an own computer',
  description:
    'Cal starts Saved carts on build-01, an own computer of Acme, in place of the cloud computer, which New workspace offers first.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/new-workspace/own-computer',
      title: 'Open New workspace',
      description:
        'Acme has own computers, so the computer choice follows the branch control, on Cloud computer, the default.',
    },
    {
      screenPath: 'app/new-workspace/own-computer/menu',
      title: 'Open the computer menu',
      description:
        'The menu lists the cloud computer, then the own computers of Acme with their states.',
    },
    {
      screenPath: 'app/new-workspace/own-computer/picked',
      title: 'Pick build-01',
      description:
        'The note under the pickers says that the workspace starts on build-01, and Cal sends the first message.',
    },
    {
      screenPath: 'app/shell/own-computer',
      title: 'The workspace starts on build-01',
      description:
        'The first step of the start names build-01, and the message waits until the sandbox is ready.',
    },
  ],
})
