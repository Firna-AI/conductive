import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const filesMenuReadOnlyTab = defineScreen({
  title: 'Tab menu in a read-only workspace',
  description:
    'The operator suspended Acme, so the workspace is read-only, and its panels say that the sandbox can\'t start. The tab of useAddressAutocomplete.ts stays in the row. A right click on it opens its menu with only Copy path. Move left, Move right, and Close tabs to the right change the workspace, so the menu leaves them out. Copy path copies src/app/checkout/useAddressAutocomplete.ts, and a toast says "Path copied". A phone row shows no file tabs, so a phone opens no menu for the file, and its Files tab shows the page of the file.',
  rationale:
    'The user chose option B of decision 3 of the file row menu change on 16 November 2026: Copy path in the menu of a file or diff tab. A copy changes nothing, so a read-only workspace keeps it, as decision 214 keeps the copy items of a session tab. So a file or diff tab of a read-only workspace now opens a menu with only Copy path. An archived workspace shows only its session tabs, so only a workspace of a suspended org shows this menu. A tab whose label hides a secret value leaves out Copy path (decision 2 A), so such a tab of a read-only workspace opens no menu.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    sandbox: 'refused',
    org: 'suspended',
    files: 'all',
    focus: 'files',
    tab: 'code',
    overlay: 'tab-menu',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
