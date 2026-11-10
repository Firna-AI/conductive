import { defineScreen } from '@mokly/mokly'
import { ArchiveScreen, archiveSchema } from '../../../../screens/ArchiveScreen'

export const archiveRestoreEnded = defineScreen({
  title: 'Restore ended',
  description:
    'The same workspace after 19 November, while a failed delete of its cloud computer tries again. Restore ended on its last day, so the bar gives that day and offers no Restore. The bar says nothing of the cloud computer, which can still exist until the delete works. The chat stays read-only, and the panel of the files promises only the chat history. The row in the Archived group and the palette offer no Restore. After the delete, the bar says that the cloud computer is deleted, as app/archive/deleted shows.',
  rationale:
    'The 14 days of decision 1 of PR #138 end on their last day, also while a delete that failed tries again. So each promise of the bar stays true: it gives the day when Restore ended, and it says that the cloud computer is deleted only after the delete.',
  relatedDocs: [],
  propSchema: archiveSchema,
  props: { view: 'restore-ended' },
  render: (props, context) => (
    <ArchiveScreen state={props} viewport={context.viewport} />
  ),
})
