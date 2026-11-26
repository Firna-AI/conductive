import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const mergeQueueMenu = defineScreen({
  title: 'Add to merge queue in the row menu',
  description:
    'A right click on Checkout address autocomplete opens its menu: Move to section, Reassign to, Rename, Copy link, a line, then Add to merge queue and Archive. Its pull request targets main, and Cal has write access to acme/storefront, so the menu offers Add to merge queue. Add puts it at the top of the stack, at place 3. On a phone the menu opens as a sheet.',
  rationale:
    'Decision 317 D puts Add to merge queue in the menu of the row, in the menu of the header, and in the palette. The item shows only for a pull request whose unit targets the default branch, and for a member with write access, as Merge does. It joins Archive after the line, because both end the work on a workspace.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'none',
    palette: 'closed',
    mergeQueue: 'menu',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'queued',
      title: 'Menu of a queued row',
      description:
        'A right click on Apple Pay button in the group opens its menu: Reassign to, Rename, Copy link, a line, then Remove from queue and Archive. A queued workspace shows only in the group, so its menu has no Move to section. The row under the pointer keeps the hover of a row of a section, with Archive over its time. Remove from queue asks first, as in the bar.',
      props: { mergeQueue: 'menu-queued' },
    },
  ],
})
