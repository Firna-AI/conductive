import { defineScreen } from '@mokly/mokly'
import { ArchiveScreen, archiveSchema } from '../../../../screens/ArchiveScreen'

export const archiveJustArchived = defineScreen({
  title: 'Just archived',
  description:
    'Cal pressed Archive on the pull request bar after the merge. The workspace moved to the Archived group at once. A toast names it, gives the day when it leaves the list, 19 November, and offers Restore. Restore in the toast does what Restore on the bar does. Archive in the palette shows the same toast. Archive on a row of the list, and in its menu, shows it over the list, as app/workspace-menu/archive shows.',
  rationale:
    'Archive asks no question, so its undo must be close at hand. The toast is the toast of Firna, with its action button. When the toast goes, the bar and the row in the Archived group still offer Restore. An agent call of 13 November 2026, for option D of decision 518: the toast gives the day when the workspace leaves the list, as the bar does, so the removal never comes without a notice.',
  relatedDocs: [],
  propSchema: archiveSchema,
  props: { view: 'just-archived' },
  render: (props, context) => (
    <ArchiveScreen state={props} viewport={context.viewport} />
  ),
})
