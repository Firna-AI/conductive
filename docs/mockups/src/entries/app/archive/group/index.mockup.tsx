import { defineScreen } from '@mokly/mokly'
import { ArchiveScreen, archiveSchema } from '../../../../screens/ArchiveScreen'

export const archiveGroup = defineScreen({
  title: 'Archived group',
  description:
    'Cal opened the Archived group at the end of the list. It holds the workspaces of the last 14 days, the last archived first. The pointer is over Checkout address autocomplete, and Restore covers its time. Checkout page redesign and Black Friday banner offer Restore on hover too. Postcode lookup for the shipping and billing forms left the list after its 14 days, so the group has no row for it, as app/archive/removed shows. A phone has no pointer, so its rows show their times. A row opens its workspace, whose bar offers Restore.',
  rationale:
    'A row offers Restore as a row in a section offers Archive: only hover shows it, over the time, so the row does not move. Selection and keyboard focus alone keep the time visible. Restore from a row puts the workspace back in its section without opening it. The menu of an archived row keeps only Reassign to, for an admin, as app/workspace-menu/reassign/archived shows, so Restore stays on the row. From option D of decision 518, a workspace leaves the group when its 14 days end, also from the count of the closed group. So a row without Restore is rare: it has no kept cloud computer, as app/archive/no-computer shows.',
  relatedDocs: [],
  propSchema: archiveSchema,
  props: { view: 'group' },
  render: (props, context) => (
    <ArchiveScreen state={props} viewport={context.viewport} />
  ),
})
