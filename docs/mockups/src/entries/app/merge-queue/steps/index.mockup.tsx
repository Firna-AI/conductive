import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const mergeQueueSteps = defineScreen({
  title: 'Steps of a merge',
  description:
    'The queue merges Apple Pay button, place 2, and GitHub lands Upgrade to Next.js 16, place 1, with it in one step, so both rows say Merging. Checkout address autocomplete, place 3, waits for its checks. Fix flaky cart test, place 4, gets its one fix turn: its agent works, and its row says Fixing checks. Its red mark shows the failed checks.',
  rationale:
    'The Worker merges the highest layer that is ready to merge when each layer below it is ready too, and GitHub lands every layer below it with it (decision 313). A red layer gets one fix turn with the prompt of the action of the bar. The step words say what the queue does now, and the mark keeps the GitHub state of the checks.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'none',
    palette: 'closed',
    mergeQueue: 'merging',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'merged',
      title: 'After the merge',
      description:
        'The merge landed #476 and #479 in main. Both left the queue and stand in their sections again, with the purple mark of a merge: Apple Pay button in Checkout, and Upgrade to Next.js 16 in the collapsed Infra. The other layers count from place 1 again. GitHub moved Checkout address autocomplete onto main, so it waits for its checks again.',
      rationale:
        'A merge is a cause of the one leave step of the queue, so a merged workspace goes back to its section, where Continue and Archive wait in its bar.',
      props: { mergeQueue: 'merged' },
    },
    {
      slug: 'empty',
      title: 'After the last merge',
      description:
        'The queue merged its last layers. No queue has entries, so the list shows no Merge queue group, and the four workspaces stand in their sections with the mark of a merge.',
      rationale:
        'Cal asked for a group that shows only while a queue has entries. An empty group would take room at the top of each list and say nothing.',
      props: { mergeQueue: 'empty' },
    },
  ],
})
