import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const bannerMergeStack = defineScreen({
  title: 'Merge a GitHub stack',
  description:
    'Checkout address autocomplete is the top of a GitHub stack with two open pull requests below it. Merge stack (3) lands all three with the GitHub account and merge method of the member who clicks.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...checksWorkspace,
    banner: 'ready-to-merge',
    queue: 'direct-stack',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'through-queue',
      title: 'Lower layers in this org’s queue',
      description:
        'The two lower pull requests are in this org’s merge queue and show in the sidebar. Merge stack (3) asks the queue to check the two layers and land all three.',
      props: { queue: 'stack-through-queue' },
    },
    {
      slug: 'another-org',
      title: 'Lower layers in another org’s queue',
      description:
        'The bar gives the reason a merge cannot start. The other org’s entries are private.',
      props: { queue: 'stack-held' },
    },
  ],
})
