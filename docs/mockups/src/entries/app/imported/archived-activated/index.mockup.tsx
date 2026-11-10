import { defineScreen } from '@mokly/mokly'
import {
  ImportedArchiveScreen,
  importedArchiveSchema,
} from '../../../../screens/ImportedArchiveScreen'

export const importedArchivedActivated = defineScreen({
  title: 'Archived after activation',
  description:
    'Coupon totals at checkout after its activation succeeded, archived on 5 November. Archive was one action, with no question, as for every activated workspace. The app keeps its cloud computer, so the bar in place of the composer gives the last day of Restore, 19 November. The chat of Apply coupons before tax stays read-only, and its first line still opens the Markdown of the old session. The workspace sits in the open Archived group, and Check webhook signatures stays in Import from Conductor. On a phone the archived workspace shows only its chat. The variants show the toast just after Archive, the Archived group, and the old document.',
  rationale:
    'After a successful activation, an imported workspace follows the Archive and Restore of every workspace, so Archive asks no question and Restore needs the kept cloud computer. The question of Archive stays only before a successful activation, as app/imported/archive shows. Restore returns the workspace stopped, in its section, as app/imported/ready/stopped shows, and starts nothing. Only the record of an activated workspace draws these screens, because an Archive alone does not show a successful activation.',
  relatedDocs: [],
  propSchema: importedArchiveSchema,
  props: { view: 'archived' },
  render: (props, context) => (
    <ImportedArchiveScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'just-archived',
      title: 'Just archived',
      description:
        'Cal pressed Archive on the row of the activated workspace. It moved to the Archived group at once, and the toast names it and offers Restore, as for every workspace whose cloud computer the app keeps.',
      props: { view: 'just-archived' },
    },
    {
      slug: 'group',
      title: 'Archived group',
      description:
        'The list with the open Archived group. The pointer is over Coupon totals at checkout, and Restore covers its time. Restore puts the workspace back in Import from Conductor, stopped. A phone has no pointer, so its row shows its time, and the row opens the archived workspace, whose bar offers Restore.',
      props: { view: 'group' },
    },
    {
      slug: 'document',
      title: 'Old session',
      description:
        'The first line of Apply coupons before tax opened the Markdown of its old session in the archived workspace, in a tab on desktop and in the Chat tab of a phone. The old documents stay readable after an Archive.',
      props: { view: 'document' },
    },
  ],
})
