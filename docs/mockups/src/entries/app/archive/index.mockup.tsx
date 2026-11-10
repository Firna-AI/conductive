import { defineScreen } from '@mokly/mokly'
import { ArchiveScreen, archiveSchema } from '../../../screens/ArchiveScreen'

export const archive = defineScreen({
  title: 'Archive',
  description:
    'Cal archived Checkout address autocomplete on 5 November, after its merge. Archive stopped its cloud computer at once, with no check and no question. The workspace sits in the open Archived group at the end of the list, and its chat is read-only. The bar in place of the composer gives the last day of Restore, 19 November. Restore puts the workspace back in its section, with its files and sessions. Every member of Acme sees Restore. The right column of a desktop keeps only the pull request, and a phone shows only the chat.',
  rationale:
    'The user chose option C of decision 1 of PR #138 on 10 November 2026, with 14 days in place of 7: Archive stops the cloud computer and keeps it, with no check and no question, so an archived workspace can come back. The check of option D of decision 16 needed a running cloud computer, so Archive of most older workspaces failed. 14 days after the Archive, the app deletes the cloud computer. The user chose option B of decision 2 of PR #138 on the same day: every member of an org that is not suspended may restore, because Restore deletes nothing. Only the owner of the workspace and the admins of the org see Archive, as decision 42 says.',
  relatedDocs: [],
  propSchema: archiveSchema,
  props: { view: 'archived' },
  render: (props, context) => (
    <ArchiveScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'just-archived',
      title: 'Just archived',
      description:
        'Cal pressed Archive on the pull request bar after the merge. The workspace moved to the Archived group at once, and a toast names it and offers Restore. Restore in the toast does what Restore on the bar does. Archive on the row of a workspace and in the palette shows the same toast.',
      rationale:
        'Archive asks no question, so its undo must be close at hand. The toast is the toast of Firna, with its action button. When the toast goes, the bar and the row in the Archived group still offer Restore.',
      props: { view: 'just-archived' },
    },
    {
      slug: 'group',
      title: 'Archived group',
      description:
        'Cal opened the Archived group at the end of the list. The pointer is over Checkout address autocomplete, and Restore covers its time. Checkout page redesign and Black Friday banner offer Restore on hover too. The app deleted the cloud computers of Stripe SDK upgrade and Postcode lookup 14 days after their Archive, so their rows offer no Restore. A phone has no pointer, so its rows show their times. A row opens its workspace, whose bar offers Restore.',
      rationale:
        'A row offers Restore as a row in a section offers Archive: only hover shows it, over the time, so the row does not move. Selection and keyboard focus alone keep the time visible. Restore from a row puts the workspace back in its section without opening it.',
      props: { view: 'group' },
    },
    {
      slug: 'deleted',
      title: 'Cloud computer deleted',
      description:
        'The same workspace after 19 November. The app deleted its cloud computer 14 days after the Archive, so the bar says so and offers no Restore. The chat stays read-only in the Archived group, and the palette offers no Restore workspace. Each workspace without a kept cloud computer shows this bar.',
      rationale:
        'Nothing is left to bring back, so the workspace offers no Restore anywhere. The files and the tools went with the cloud computer.',
      movedFrom: 'app/archive/archived',
      props: { view: 'deleted' },
    },
    {
      slug: 'restored',
      title: 'Restored',
      description:
        'Cal pressed Restore. Checkout address autocomplete is back in Checkout, at its place, with its files and sessions. Its cloud computer stays stopped, so the bar offers Resume, as for each stopped workspace. The merged pull request offers Archive again.',
      rationale:
        'Restore starts nothing by itself. A resume already gives the cloud computer a fresh workspace token and fresh env values. The workspace was open, so it shows Resume, as a workspace whose cloud computer stops while it is open does.',
      props: { view: 'restored' },
    },
  ],
})
