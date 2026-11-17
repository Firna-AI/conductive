import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const filesMenuCopied = defineScreen({
  title: 'Path copied',
  description:
    'Cal chose Copy path in the menu of AddressForm.tsx. The menu closed, and a toast at the bottom right says "Path copied". The clipboard holds src/app/checkout/AddressForm.tsx. The focus went back to the row, and the shown tab stays as it is. On a phone, the sheet closed, and the toast spans the bottom of the screen.',
  rationale:
    'A design call of 16 November 2026 gives the result in a toast, because the menu closes at the press, as for Copy link in the menu of a workspace row. The words follow Copy link, which says "Link copied". The copy runs during the press, so the Mac app copies too. Copy path in the menu of a file or diff tab gives the same toast.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
    copyPath: 'copied',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Copy failed',
      description:
        'The clipboard refused the path. The toast says "The path didn\'t copy. Try again." with the error mark, so Cal opens the menu again and chooses Copy path.',
      rationale:
        'A design call of 16 November 2026 gives this toast in the words of Copy link, which says "The link didn\'t copy. Try again." The next step is a press on the item again, so the toast names no other way.',
      props: { copyPath: 'failed' },
    },
  ],
})
