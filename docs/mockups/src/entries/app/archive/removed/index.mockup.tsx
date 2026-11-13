import { defineScreen } from '@mokly/mokly'
import { ArchiveScreen, archiveSchema } from '../../../../screens/ArchiveScreen'

export const archiveRemoved = defineScreen({
  title: 'Removed',
  description:
    'Postcode lookup for the shipping and billing forms, W-372, after its 14 days. A member archived it on 15 October, and on 29 October it left the list. No section and no Archived group holds it, so no row is selected, and the closed Archived group counts only the two workspaces of the last 14 days. The app deleted its cloud computer and keeps its chat, so its link and its chip still open it. The bar in place of the composer gives the day of the removal. It says that the workspace left the list, that its cloud computer is deleted, and that the chat is read-only. Nothing offers Restore. The panel of the files is Removed, and a phone shows only the chat.',
  rationale:
    'The user chose option D of decision 518 on 13 November 2026: when its 14 days end, an archived workspace leaves the Archived group, and the app keeps all its data. The user chose option B of decision 519 on the same day: only a direct link opens a removed workspace, with its read-only chat. The user chose option A of decision 520 on the same day: the app says "removed", never "deleted", for the workspace, because the app keeps its data. Only the cloud computer is deleted.',
  relatedDocs: [],
  movedFrom: 'app/archive/deleted',
  propSchema: archiveSchema,
  props: { view: 'removed' },
  useCasePaths: ['user-flows/open-a-removed-workspace'],
  render: (props, context) => (
    <ArchiveScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'deleting',
      title: 'Cloud computer still being deleted',
      description:
        'The same workspace on 29 October, the day it left the list, while a failed delete of its cloud computer tries again. The bar says that the cloud computer is being deleted. The panel of the files says that the files and the tools go with it. Restore ended with the 14 days, so nothing offers it.',
      rationale:
        'Restore ends on its last day, also while a delete that failed tries again, so no screen offers a Restore that the app refuses. The bar says that the cloud computer is deleted only after the delete.',
      movedFrom: 'app/archive/restore-ended',
      props: { view: 'removed-deleting' },
    },
  ],
})
