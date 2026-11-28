import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const mergeQueueCannotJoin = defineScreen({
  title: 'A row that cannot join',
  description:
    'Cal drags Fix flaky cart test over the group. Its pull request targets release/2026.11, and the queue of acme/storefront merges into main, so the row cannot join. The queue takes the dashed outline of the zone in the neutral colour, with no fill and no drop line, and names the reason after its rows: "It targets release/2026.11. The queue merges into main." The lifted row floats under the words, and a faint copy stays in Checkout. A drop there changes nothing, and the row goes back to its place. On a phone a long press lifts the row, and the queue at the top of the list page shows the same words.',
  rationale:
    'Decision 317 D makes the group a drop target during each drag while it shows. The design of 22 November 2026 adds that the target of a row that cannot join names the reason and takes no drop, so a drop never fails without a reason. The accent and the drop line show only on a target that takes the drop. The words of each reason come from `joinRefusalText` in `queueCopy.ts`.',
  relatedDocs: ['docs/protocol/merge-queue-in-the-app.md'],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'none',
    palette: 'closed',
    mergeQueue: 'refused-branch',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'write-access',
      title: 'Without write access',
      description:
        'Priya, a member with read access to acme/storefront, drags Fix flaky cart test over the group. Its pull request targets main, but only a member with write access changes the queue, so the queue names that: "You need write access to acme/storefront." She sees the queue, as every member does.',
      rationale:
        'Every member of the org sees each queue, and a member with write access or more to the repository adds, removes, and re-orders entries, because Merge already needs that access (decision 221).',
      props: { mergeQueue: 'refused-access' },
    },
  ],
})
