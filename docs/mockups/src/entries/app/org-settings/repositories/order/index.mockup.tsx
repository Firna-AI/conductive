import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

const decision =
  'The user chose option F of repository-order decision 1 on 18 November 2026: an admin moves a chosen repository by a drag, by its row menu with Make default, Move up, and Move down, or by Alt and Up or Down on a focused row, as an org tile of the rail moves. The first repository is the default, and its row shows Default.'

const removeDecision =
  'The user asked on 24 November 2026 that an admin can remove a repository from its row menu, and chose option E of row-remove decision 1 the same day: Remove asks first, and the question names what adding the repository again does not bring back.'

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
        'Cal opens the row menu of acme/billing-service, the second row: Make default, Move up, and Move down, then Remove after a divider, in the danger colour. Make default moves the row to the top. Move up and Move down move it one place. On the first row, Make default and Move up are off, and on the last row Move down is off. Remove is never off, and it asks first, as the two Remove variants show. A phone opens the same menu as a sheet with the name of the repository. Alt and Up or Down, with no other modifier, also move a focused row one place, and the focus stays on it.',
      rationale: `${decision} Make default names the result that the person wants, so it takes the place of Move to top. A move that the place of the row rules out keeps its place, greyed, as in the tile menu. ${removeDecision} Design calls of 24 November 2026: Remove comes last, after a divider, in the danger tone, as Delete section does in the section menu, because a removal is not a move. It has the label and the X icon of Remove in Edit, because one action has one name and one icon. It is never off, because Edit also removes the first and the only row.`,
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
    {
      slug: 'remove-default',
      title: 'Remove the default',
      description:
        'Cal selected Remove in the row menu of acme/storefront, the first row. The question "Remove acme/storefront?" says that New workspace no longer offers it and that acme/billing-service becomes the default. Its 2 automations that are on turn off, and only their owners can turn them on again. Cancel changes nothing. Remove shows a spinner until the server answers. Then the row leaves the list, the focus goes to the next row, and a screen reader hears "acme/storefront is removed". The repository notice then names acme/storefront with Build computer, because a removal starts no build. A failed removal keeps the question and the row, and a toast says "The repository wasn\'t removed." with the error. A phone opens the question as a sheet.',
      rationale: `${removeDecision} The admin alone cannot undo all of a removal: adding the repository again puts it at the end of the order, and each automation stays off until its owner turns it on. So the question names these losses before anything saves. It counts only the automations that are on. While the automations load, or when they do not load, it says that each of them turns off, with no number. Remove saves with the route of Done. A removal at once, an Undo in a toast, and a Remove that opens Edit were rejected. The question has no warning about the install script, as for a removal in Edit, because the log of a failed build shows the cause.`,
      props: { repositoryOrder: 'remove-first' },
    },
    {
      slug: 'remove-last',
      title: 'Remove another row',
      description:
        'Cal selected Remove in the row menu of acme/marketing-site, the last row. It is not the default, and both of its automations are off already, so the question "Remove acme/marketing-site?" says only that New workspace no longer offers it. On the only row, the question says instead that no new workspace can start until Cal adds a repository.',
      rationale: `${removeDecision} The question leaves out each sentence that names no loss, so it stays short.`,
      props: { repositoryOrder: 'remove-last' },
    },
  ],
})
