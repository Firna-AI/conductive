import { defineScreen } from '@mokly/mokly'
import { ArchiveScreen, archiveSchema } from '../../../../screens/ArchiveScreen'

export const archiveComputerRemoved = defineScreen({
  title: 'Own computer removed',
  description:
    'Cal archived Checkout address autocomplete on 5 November. An admin removed old-runner, its own computer, from Acme, so the workspace cannot start again. It sits in the open Archived group, and its chat is read-only. The bar gives the day of the Archive. It says that the files stay on old-runner, and it gives the day when the workspace leaves the list, 19 November. It gives no day of a delete, and nothing offers Restore: not the bar, not the row, and not the command palette. The panel of the files is Archived, and a phone shows only the chat.',
  rationale:
    'The app deletes no file and no org image on a removed own computer, as the design calls of the plan say. The Remove question says so too. Restore cannot bring back files that the app cannot reach, and the start of such a workspace stays refused, so nothing offers Restore. The workspace still leaves the list after its 14 days, as every archived workspace does. Cal has not chosen yet whether such a workspace offers Restore. This page draws the recommendation: no Restore.',
  relatedDocs: [],
  propSchema: archiveSchema,
  props: { view: 'computer-removed' },
  render: (props, context) => (
    <ArchiveScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'removed',
      title: 'Removed, files on the server',
      description:
        'The same workspace on 19 November, after its 14 days. It left the list, so no section and no Archived group holds it, and no row is selected. Its link and its chip still open it. The bar gives the day of the removal. It says that the workspace left the list, and that its files stay on old-runner, an own computer that an admin removed. It says that the chat is read-only. It gives no day of a delete. The panel of the files is Removed.',
      rationale:
        'Agent call of 23 November 2026: the Remove question already says that the app deletes no file on the server. So the bar of a removed workspace on a removed own computer says that the files stay there, and gives no delete day. The user chose option D of decision 518 on 13 November 2026. When its 14 days end, an archived workspace leaves the list, and the app keeps all its data. The user chose option A of decision 520 on the same day: the app says "removed", never "deleted", for the workspace.',
      props: { view: 'computer-removed-left' },
    },
  ],
})
