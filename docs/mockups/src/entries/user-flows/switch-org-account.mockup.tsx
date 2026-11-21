import { defineUseCase } from '@mokly/mokly'

export const switchOrgAccount = defineUseCase({
  title: 'Switch the account of an org',
  description:
    'An operator moves the new workspaces of an org to another provider account. The existing workspaces stay where they run.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/operator/org',
      title: 'Open the page of the org',
      description:
        'The Provider account box gives boat, the account of Hexwave, with Switch account.',
    },
    {
      screenPath: 'app/operator/org/switch',
      title: 'Confirm the switch',
      description:
        'The question says that the switch builds the cloud computer of Hexwave again on e2b, and that new workspaces move when that build succeeds.',
    },
    {
      screenPath: 'app/operator/org/switch-build',
      title: 'The switch build runs',
      description:
        'Hexwave stays on boat until the build succeeds. Only this page shows the build, and members see no sign of it.',
    },
    {
      screenPath: 'app/operator/org/switched',
      title: 'Hexwave runs on e2b',
      description:
        'New workspaces start on e2b. The workspaces from before the switch stay on boat, so the page counts the workspaces on each account.',
    },
  ],
})
