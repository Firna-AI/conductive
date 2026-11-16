import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const filesMenuFolder = defineScreen({
  title: 'Menu of a folder',
  description:
    'A right click on the checkout folder, src/app/checkout, opens the same menu: Add to chat, a line, then Copy path. Add to chat puts the folder chip @src/app/checkout/ in the message field, with a final slash, as a pick from the list of @ writes it. Copy path copies src/app/checkout, with no final slash. The right click leaves the folder open. On a phone, the sheet has the name checkout as its title.',
  rationale:
    'Decision 1 of the file row menu change gives the menu to the folder rows too, so a member can copy or mention a folder as a file. A design call of 16 November 2026 copies a folder path with no final slash, as the tree holds it. The chip keeps its final slash, because the message field reads a mention that ends with a slash as a folder. Only a press on the row opens or closes a folder.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
    rowMenu: 'folder',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
