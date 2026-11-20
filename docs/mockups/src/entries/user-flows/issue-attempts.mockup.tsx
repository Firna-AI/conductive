import { defineUseCase } from '@mokly/mokly'

export const issueAttempts = defineUseCase({
  title: 'Compare two attempts at an issue',
  description:
    'Variation C: the person starts two attempts at one issue, with Claude and with Codex, then compares them on the issue.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/issues/parent',
      title: 'Open the issue',
      description:
        'Cal opens I-31 from the Issues page. Issues with workspaces head their trees in the sidebar.',
    },
    {
      screenPath: 'app/issues/parent/start',
      title: 'Choose two attempts',
      description:
        'The menu of Start offers one workspace, two attempts, or a plan that splits the issue.',
    },
    {
      screenPath: 'app/issues/parent/workspace',
      title: 'Follow an attempt',
      description:
        'Both attempts show under the issue in the sidebar. Cal opens the Codex attempt.',
    },
    {
      screenPath: 'app/issues/parent/attempts',
      title: 'Compare them',
      description:
        'The issue lists both attempts with their changes and pull requests. The Claude attempt is ready to merge.',
    },
  ],
})
