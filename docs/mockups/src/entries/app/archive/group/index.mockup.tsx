import { defineScreen } from '@mokly/mokly'
import { ArchiveScreen, archiveSchema } from '../../../../screens/ArchiveScreen'

export const archiveGroup = defineScreen({
  title: 'Archived group',
  description:
    'Cal opened the Archived group at the end of the list. The pointer is over Checkout address autocomplete, and Restore covers its time. Checkout page redesign and Black Friday banner offer Restore on hover too. The app deleted the cloud computers of Stripe SDK upgrade and Postcode lookup 14 days after their Archive, so their rows offer no Restore. A phone has no pointer, so its rows show their times. A row opens its workspace, whose bar offers Restore.',
  rationale:
    'A row offers Restore as a row in a section offers Archive: only hover shows it, over the time, so the row does not move. Selection and keyboard focus alone keep the time visible. Restore from a row puts the workspace back in its section without opening it. The menu of an archived row keeps only Reassign to, for an admin, as app/workspace-menu/reassign/archived shows, so Restore stays on the row.',
  relatedDocs: [],
  propSchema: archiveSchema,
  props: { view: 'group' },
  render: (props, context) => (
    <ArchiveScreen state={props} viewport={context.viewport} />
  ),
})
