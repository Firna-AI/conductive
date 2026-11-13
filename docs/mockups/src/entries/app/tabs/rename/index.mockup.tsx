import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const tabsRename = defineScreen({
  title: 'Rename a session',
  description:
    'The user chose Rename session in the menu of the Address autocomplete tab, which does not show. That tab now holds the rename field, with its title selected, so typing replaces it. The border of the field marks the tab, and only New session, the shown tab, is filled. On a phone, the field shows in the same tab of the phone row. The row scrolls so that the field is in view, and a fade marks the end that clips tabs.',
  rationale:
    'The user chose option G of decision 188 on 9 November 2026: a right click on a tab opens a menu with a rename option. On the same day, the user removed the Rename button of the shown session tab, so Rename session in the tab menu is the one way to rename a session. The field opens in the tab that the user chose, also when that tab does not show, so the chat does not change. A design call of the same day gave that tab a state of its own: no fill, so the row shows one shown tab. The field keeps about the width of its title, and a row with room keeps the shown tab in view. Enter or a click outside the field saves the name, and Escape keeps the old one.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, tab: 'new-session', tabRow: 'rename' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
