import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const tabs = defineScreen({
  title: 'Move tabs',
  description:
    'The user drags the useAddressAutocomplete.ts tab between the two sessions. The tab lifts under the pointer as a raised card, a faint copy stays where it was, and a line shows where it lands. Address autocomplete stays the shown tab. On a phone, a long press lifts Debounce lookups, and the line marks its place until the finger moves it.',
  rationale:
    'The user chose option B of decision 186 on 8 November 2026: any tab, a session or a file, moves to any place in the row. The row keeps one order for all its tabs, which the saved view of the user keeps. The drag looks like the drag of a workspace row, so every drag in the app looks the same. The line takes no space, so no tab moves during the drag, and the drag does not change the shown tab. A phone shows only the session tabs, and a long press lifts a tab, as it lifts a workspace row. The user chose option B of decision 287 on 12 November 2026: a move to another place keeps a temporary tab, as the Temporary tab page shows.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, tabRow: 'drag' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'moved',
      title: 'After the move',
      description:
        'The useAddressAutocomplete.ts tab now sits between the two sessions. Then + started a new session, and its tab opened at the end of the row as the shown tab. A phone shows only the sessions, in the same order.',
      rationale:
        'Decision 186 keeps one rule for every new tab, a session or a file: it opens at the end of the row. The order stays after a reload and on the other devices of the user, because the saved view keeps it.',
      props: { tab: 'new-session', tabRow: 'moved' },
    },
    {
      slug: 'full',
      title: 'A full row',
      description:
        'The row has more tabs than fit. The tabs shrink to their minimum width, and the row scrolls sideways, with no scrollbar. The new session at the end of the row shows, so the row scrolled to it. A fade marks the start of the row, where it clips tabs. On a phone, the session tabs shrink to their icons, and the row scrolls in the same way.',
      rationale:
        'The user chose option B of decision 187 on 9 November 2026. The row keeps the shown tab in view, also a new tab at the end of the row, and every tab stays in reach of a click and a drag. A vertical turn of the mouse wheel scrolls the row sideways, and a finger scrolls it. During a drag, the pointer near an end scrolls the row, so a drop can reach every place.',
      props: { tab: 'new-session', tabRow: 'full' },
    },
    {
      slug: 'menu',
      title: 'Tab menu',
      description:
        'A right click on the Address autocomplete tab opens its menu: Rename session, a line, Copy concise transcript and Copy full transcript, a line, then Move left and Move right. It is the first tab, so Move left is off. The menu of a kept file or diff tab has only Move left and Move right. On a phone, a long press that ends without a move opens the same menu as a sheet. The Copy a transcript page shows the toast after a copy, and the menu of an archived workspace. The Temporary tab page shows the menu of the temporary tab, which leads with Keep open.',
      rationale:
        "The user chose option G of decision 188 on 9 November 2026: a right click on a tab opens a menu with a move and a rename, in the style of Conductor's tab menu, with flat rows in groups and a line between the groups. Move left and Move right move the tab one place, for a user who does not drag. An item that the place of the tab rules out keeps its place, greyed. The user also removed the Rename button of the shown session tab, so the menu is the one way to rename a session. The user chose option B of decision 215 on 9 November 2026: two copy items, as Conductor has, in their own group between the rename and the moves. Copy concise transcript copies the chat as it shows at first, with each fold closed, and Copy full transcript copies it with every fold open. The user chose option B of decision 214 on the same day: in a read-only workspace, the menu of a session tab holds only the two copy items, and a file or diff tab opens no menu.",
      props: { tab: 'new-session', tabRow: 'opened', overlay: 'tab-menu' },
    },
    {
      slug: 'rename',
      title: 'Rename a session',
      description:
        'The user chose Rename session in the menu of the Address autocomplete tab, which does not show. That tab now holds the rename field, with its title selected, so typing replaces it. The border of the field marks the tab, and only New session, the shown tab, is filled. On a phone, the field shows in the same tab of the phone row. The row scrolls so that the field is in view, and a fade marks the end that clips tabs.',
      rationale:
        'The user chose option G of decision 188 on 9 November 2026: a right click on a tab opens a menu with a rename option. On the same day, the user removed the Rename button of the shown session tab, so Rename session in the tab menu is the one way to rename a session. The field opens in the tab that the user chose, also when that tab does not show, so the chat does not change. A design call of the same day gave that tab a state of its own: no fill, so the row shows one shown tab. The field keeps about the width of its title, and a row with room keeps the shown tab in view. Enter or a click outside the field saves the name, and Escape keeps the old one.',
      props: { tab: 'new-session', tabRow: 'rename' },
    },
  ],
})
