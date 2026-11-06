import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const checks = defineScreen({
  title: 'Checks and merge',
  description: 'The pull request is open, and its checks still run.',
  rationale:
    'These states lead to a merge: the checks run, fail, or pass, and the pull request merges on GitHub. Moved here from the banner page, which now shows only its canonical screen beside its child pages.',
  relatedDocs: [],
  movedFrom: 'app/banner/checks-running',
  propSchema: workspaceStateSchema,
  props: { ...checksWorkspace, banner: 'checks-running' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Checks failed',
      description:
        'Two checks failed. The bar gives the count, and the Checks tab names them.',
      movedFrom: 'app/banner/checks-failed',
      props: { banner: 'checks-failed' },
    },
    {
      slug: 'ready-to-merge',
      title: 'Ready to merge',
      description:
        'Every check passed and a reviewer approved. Open on GitHub stands where a merge button would be, because the app does not merge.',
      movedFrom: 'app/banner/ready-to-merge',
      props: { banner: 'ready-to-merge' },
    },
    {
      slug: 'merged',
      title: 'Merged',
      description:
        'The pull request is merged into the default branch. The bar offers Archive to the owner of the workspace and the owners of the org.',
      movedFrom: 'app/banner/merged',
      props: { banner: 'merged' },
    },
  ],
})
