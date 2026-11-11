import { defineScreen } from '@mokly/mokly'
import { ArchiveScreen, archiveSchema } from '../../../../screens/ArchiveScreen'

export const archiveJustArchived = defineScreen({
  title: 'Just archived',
  description:
    'Cal pressed Archive on the pull request bar after the merge. The workspace moved to the Archived group at once. The group stays collapsed, with its count, because an Archive keeps the group open or collapsed, as it was. A toast names it and offers Restore. Restore in the toast does what Restore on the bar does. Archive in the palette shows the same toast. Archive on a row of the list, and in its menu, shows it over the list, as app/workspace-menu/archive shows.',
  rationale:
    'Archive asks no question, so its undo must be close at hand. The group does not open by itself, so an Archive does not change the list that the user set up. The group opens when the user goes to an archived workspace. The toast is the toast of Firna, with its action button. When the toast goes, the bar and the row in the Archived group still offer Restore.',
  relatedDocs: [],
  propSchema: archiveSchema,
  props: { view: 'just-archived' },
  render: (props, context) => (
    <ArchiveScreen state={props} viewport={context.viewport} />
  ),
})
