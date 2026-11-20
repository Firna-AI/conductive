import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const subWorkspacesMenu = defineScreen({
  title: 'Menu of a nested row',
  description:
    'A right click on Places API client, a nested row, opens its menu at the pointer: Reassign to, Rename, Copy link, a line, then Archive. The menu has no Move to section, because a nested row moves only with its tree. Each other action keeps the rules of its role. The row under the pointer keeps its hover, with Archive over its time. On a phone the menu opens as a sheet.',
  rationale:
    'Sub-workspace decision 4 F, which the user chose on 16 November 2026, gives a nested row no Move to section, no drag, and no move by keys. A move of its top-level row moves it with the tree. The menu hides each action that the person cannot use, as it hides Move to section in an org with one section.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'none',
    palette: 'closed',
    subWorkspaces: 'menu',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'member',
      title: 'A member',
      description:
        'Priya, a member who is not an admin, right-clicks Places API client, a workspace of Cal. Her menu has Rename and Copy link: only admins reassign, only the owner and the admins archive, and a nested row has no Move to section. The rail shows her avatar. On a phone her sheet has the same two actions.',
      props: { subWorkspaces: 'menu-member' },
    },
    {
      slug: 'top-level',
      title: 'A top-level row',
      description:
        'Cal right-clicks Checkout address autocomplete, the top-level row of the deepest tree. Its menu is the menu of any top-level row, with Move to section, and the sections open beside it, with Checkout checked. Another section takes the whole tree to its top, as a drag of the row does. On a phone the sheet shows the sections in place of the menu.',
      props: { subWorkspaces: 'menu-top-level' },
    },
  ],
})
