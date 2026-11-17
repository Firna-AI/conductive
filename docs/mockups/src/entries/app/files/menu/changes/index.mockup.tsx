import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const filesMenuChanges = defineScreen({
  title: 'Menu of a changed file',
  description:
    'In Changes, a right click on the row of AddressForm.tsx opens the same menu as in All files: Add to chat, a line, then Copy path. Copy path copies src/app/checkout/AddressForm.tsx. For a moved file it copies the new path. The menu opens no diff, so the shown tab stays as it is. On a phone, a long press on the row opens the menu as a sheet.',
  rationale:
    'Decision 1 of the file row menu change gives each row of Changes the menu of a row of All files, so a member finds the same items in both lists. A design call of 16 November 2026 copies the new path of a moved file, because that path names the file on the branch.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'changes',
    focus: 'files',
    rowMenu: 'file',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'deleted',
      title: 'Menu of a deleted file',
      description:
        'The branch deletes postcodeLookup.ts, so its menu has only Copy path, with no line. Copy path copies src/app/checkout/postcodeLookup.ts, the path that the file had. Add to chat stays out, because its chip would name a file that the branch does not hold.',
      rationale:
        'A design call of 16 November 2026 leaves Add to chat out on a deleted file of Changes. The message field turns a mention back into text when the list of @ does not offer its path, and that list offers only the files and folders of the branch. Copy path stays, and a design call of the same day copies the path that the file had.',
      props: { rowMenu: 'deleted' },
    },
  ],
})
