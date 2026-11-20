import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

const decision =
  'The user chose option F of repository-order decision 1 on 18 November 2026: an admin moves a chosen repository by a drag, by its row menu with Make default, Move up, and Move down, or by Alt and Up or Down on a focused row, as an org tile of the rail moves. The first repository is the default, and its row shows Default.'

export const repositoryOrder = defineScreen({
  title: 'Repository order',
  description:
    'Cal drags acme/marketing-site from the bottom of the list to the top. The row lifts under the pointer as a raised card, a faint copy stays in its place, and a line above acme/storefront shows where it lands. Escape ends the drag, and the order stays as it was. On a phone, a long press on the row lifts it, and the finger moves it in the same way. A drop saves the order at once, for the whole org, and starts no build.',
  rationale: `${decision} The drag looks like the drag of an org tile and of a workspace row, so every drag in the app looks the same. The line takes no space, so no row moves during the drag. Design calls of 18 November 2026: a move starts no build, because the order is a setting of the app lists and not of the cloud computer, and the moves show outside Edit only, because the list of Edit is in name order.`,
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'repositories', repositoryOrder: 'drag' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'menu',
      title: 'Row menu',
      description:
        'Cal opens the row menu of acme/billing-service, the second row: Make default, Move up, and Move down. Make default moves the row to the top. Move up and Move down move it one place. On the first row, Make default and Move up are off, and on the last row Move down is off. A phone opens the same menu as a sheet with the name of the repository. Alt and Up or Down, with no other modifier, also move a focused row one place, and the focus stays on it.',
      rationale: `${decision} Make default names the result that the person wants, so it takes the place of Move to top. A move that the place of the row rules out keeps its place, greyed, as in the tile menu.`,
      props: { repositoryOrder: 'menu' },
    },
    {
      slug: 'moved',
      title: 'After Make default',
      description:
        'Cal selected Make default on acme/billing-service. The list now starts with acme/billing-service, which shows Default, then acme/storefront and acme/marketing-site. A screen reader hears "acme/billing-service moves to place 1 of 3". New workspace now picks acme/billing-service and lists the repositories in this order, and so does a new automation. A draft that already picked a repository keeps it. Every member sees the new order at the next read of the list.',
      rationale: `${decision} The order belongs to the org, so every member reads it, and only an admin changes it (decision 57). The New workspace form keeps its rule of the first ready repository, now in this order.`,
      props: { repositoryOrder: 'moved' },
    },
  ],
})
