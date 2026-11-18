import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const subWorkspacesDrag = defineScreen({
  title: 'Drag a tree',
  description:
    'Cal drags Apple Pay button, a top-level row, from Checkout to General. Its whole tree moves with it. The row lifts under the pointer over the edge of a second card, with +2, the count of the sub-workspaces that move with it, in place of its time. The three rows of the tree stay faint in Checkout. The line between Dark mode for emails and Invoice PDF fonts shows where the tree lands, at the edge of a top-level row. A nested row does not lift: a drag of it, a long press on it, or Alt with Up or Down on it moves nothing. On a phone a long press lifts a top-level row in the same way.',
  rationale:
    'The user chose option F of sub-workspace decision 4 on 16 November 2026: the parent link alone decides the nesting, so a sub-workspace shows under its parent in any section. A move of a top-level row moves its whole tree, and a nested row has no drag, no move by keys, and no Move to section. The lifted row stands for its tree, as the lifted header of a section shows the count of its workspaces. So the lifted card stays as small as the card of one row, and the rows around the line stay in view.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'none',
    palette: 'closed',
    subWorkspaces: 'drag',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'moved',
      title: 'After the move',
      description:
        'The list after the drop. Apple Pay button is in General, between Dark mode for emails and Invoice PDF fonts, with Merchant validation and Wallet button tests under it. The move wrote the section of each workspace of the tree, so Checkout keeps only its other rows.',
      props: { subWorkspaces: 'moved' },
    },
    {
      slug: 'between-trees',
      title: 'Between two trees',
      description:
        'Cal drags Checkout address autocomplete up in Checkout. The row lifts with +5, and its tree of six rows stays faint. The pointer is over the tree of Apple Pay button, and the line falls above that tree, after Retry failed webhooks, not between two of its rows.',
      rationale:
        'A drop never nests a workspace, because only the create call of an agent names a parent, and the parent link never changes after the create. So the line falls only between two trees, and a dropped tree stays a tree of its own.',
      props: { subWorkspaces: 'between-trees' },
    },
  ],
})
