import { defineScreen } from '@mokly/mokly'
import { ArchiveScreen, archiveSchema } from '../../../screens/ArchiveScreen'

export const archive = defineScreen({
  title: 'Archive',
  description:
    'Cal archived Checkout address autocomplete on 5 November, after its merge. Archive stopped its cloud computer at once, with no check and no question. The workspace sits in the open Archived group at the end of the list, and its chat is read-only. The bar in place of the composer gives the last day of Restore, 19 November, and says that the workspace leaves the list on that day. Restore puts the workspace back in its section, with its files and sessions. Every member of Acme sees Restore. The right column of a desktop keeps only the pull request, and a phone shows only the chat. The child pages show the toast just after Archive, the Archived group, a Restore, an archive without a kept cloud computer, and a workspace that left the list after its 14 days.',
  rationale:
    'The user chose option C of decision 1 of PR #138 on 10 November 2026, with 14 days in place of 7: Archive stops the cloud computer and keeps it, with no check and no question, so an archived workspace can come back. The check of option D of decision 16 needed a running cloud computer, so Archive of most older workspaces failed. 14 days after the Archive, the app deletes the cloud computer. The user chose option B of decision 2 of PR #138 on the same day: every member of an org that is not suspended may restore, because Restore deletes nothing. Only the owner of the workspace and the admins of the org see Archive, as decision 42 says. The user chose option D of decision 518 on 13 November 2026: when its 14 days end, an archived workspace leaves the list, and the app keeps all its data. The user chose option B of decision 519 on the same day: only a direct link opens it then, with its read-only chat. The user chose option A of decision 520 on the same day: the app says "removed", never "deleted", for the workspace.',
  relatedDocs: [],
  propSchema: archiveSchema,
  props: { view: 'archived' },
  render: (props, context) => (
    <ArchiveScreen state={props} viewport={context.viewport} />
  ),
})
