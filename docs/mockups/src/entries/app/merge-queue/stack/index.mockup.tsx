import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const mergeQueueStack = defineScreen({
  title: 'Member stack',
  description:
    'Saved carts (#490) stacks on Checkout address autocomplete (#482), because Cal started it from that branch. The two pull requests are a member stack, so they hold places 2 and 3 together. Their rows look like the other entries, with no outline of their own, because the line already joins every entry of the stack. Apple Pay button, place 4, rebases onto #490, the top of the member stack, so a light runs around its green mark.',
  rationale:
    'Decision 315 A moves a member stack through the queue as one unit, and its upper pull request always stays directly above its lower one. In his review of 22 November 2026, Cal asked for the line in place of the outline that held a member stack, because the line already shows that the entries are connected. A drag still moves the unit, as the drag variant shows. Add to merge queue on Saved carts first adds Checkout address autocomplete, in stack order.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'none',
    palette: 'closed',
    mergeQueue: 'stack',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'drag',
      title: 'Drag the stack',
      description:
        'Cal drags Checkout address autocomplete to place 1. The whole unit moves: the lifted row shows +1 for Saved carts over the edge of a second card, both rows of the unit stay faint in their place with their part of the line, and the drop line falls above Upgrade to Next.js 16, never between the two rows of the unit. On a phone a long press lifts the row in the same way.',
      rationale:
        'A drag of either row of a unit lifts the unit, as a drag of a top-level row lifts its tree. A re-order rebuilds the GitHub stack, and no merge runs until the new stack exists.',
      props: { mergeQueue: 'stack-drag' },
    },
  ],
})
