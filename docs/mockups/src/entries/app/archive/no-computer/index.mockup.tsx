import { defineScreen } from '@mokly/mokly'
import { ArchiveScreen, archiveSchema } from '../../../../screens/ArchiveScreen'

export const archiveNoComputer = defineScreen({
  title: 'Without a cloud computer',
  description:
    'Checkout address autocomplete, archived on 5 November, as it shows when the app keeps no cloud computer for an archived workspace. That happens, for example, after a failed first start. Nothing is left to bring back, so the bar offers no Restore. The bar says that the cloud computer is deleted and that the chat is read-only, and it gives the day when the workspace leaves the list, 19 November. Until then the row stays in the open Archived group, without Restore, and the palette offers no Restore workspace.',
  rationale:
    'An agent call of 13 November 2026, for option D of decision 518: every archived workspace leaves the list after its 14 days, also without a kept cloud computer and in a suspended org. Neither offers Restore, so the bar still gives the day when the workspace leaves the list, as app/orgs/suspended/workspace/archived shows for a suspended org.',
  relatedDocs: [],
  propSchema: archiveSchema,
  props: { view: 'no-computer' },
  render: (props, context) => (
    <ArchiveScreen state={props} viewport={context.viewport} />
  ),
})
