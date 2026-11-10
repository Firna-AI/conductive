import { defineScreen } from '@mokly/mokly'
import { ArchiveScreen, archiveSchema } from '../../../../screens/ArchiveScreen'

export const archiveDeleted = defineScreen({
  title: 'Cloud computer deleted',
  description:
    'The same workspace after 19 November. The app deleted its cloud computer 14 days after the Archive, so the bar says so and offers no Restore. The chat stays read-only in the Archived group, and the palette offers no Restore workspace. Each workspace without a kept cloud computer shows this bar. Before the delete works, the bar gives the day when Restore ended, as app/archive/restore-ended shows.',
  rationale:
    'Nothing is left to bring back, so the workspace offers no Restore anywhere. The files and the tools went with the cloud computer.',
  relatedDocs: [],
  propSchema: archiveSchema,
  props: { view: 'deleted' },
  render: (props, context) => (
    <ArchiveScreen state={props} viewport={context.viewport} />
  ),
})
