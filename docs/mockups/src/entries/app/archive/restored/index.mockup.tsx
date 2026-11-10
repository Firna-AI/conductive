import { defineScreen } from '@mokly/mokly'
import { ArchiveScreen, archiveSchema } from '../../../../screens/ArchiveScreen'

export const archiveRestored = defineScreen({
  title: 'Restored',
  description:
    'Cal pressed Restore. Checkout address autocomplete is back in Checkout, at its place, with its files and sessions. Its cloud computer stays stopped, so the bar offers Resume, as for each stopped workspace. The merged pull request offers Archive again.',
  rationale:
    'Restore starts nothing by itself. A resume already gives the cloud computer a fresh workspace token and fresh env values. The workspace was open, so it shows Resume, as a workspace whose cloud computer stops while it is open does.',
  relatedDocs: [],
  propSchema: archiveSchema,
  props: { view: 'restored' },
  render: (props, context) => (
    <ArchiveScreen state={props} viewport={context.viewport} />
  ),
})
