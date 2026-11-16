import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const filesMenuStopped = defineScreen({
  title: 'While the cloud computer is stopped',
  description:
    'The cloud computer of the workspace stopped, so its bar takes the place of the message field, and All files keeps the list that it saved. A right click on AddressForm.tsx opens a menu with only Copy path, with no line. Add to chat stays out, because no message field can take the chip. The same holds while another bar of the cloud computer takes the place of the field, such as after a failed start. On a phone, the sheet has only Copy path.',
  rationale:
    'A design call of 16 November 2026 leaves Add to chat out while a bar of the cloud computer takes the place of the message field. The user chose option A of decision 4 of the file row menu change on the same day, which puts the chip in the field and not in the draft, so no field can take it then. Copy path changes nothing, so it stays. A read-only workspace shows no row to open a menu: an archived workspace has no file lists, and in a suspended org the refused start takes the place of All files and Changes. So a read-only workspace keeps Copy path only in the menu of a file or diff tab.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    sandbox: 'stopped',
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
    rowMenu: 'file',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
