import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const splitTemporary = defineScreen({
  title: 'A temporary tab in each pane',
  description:
    'Each pane keeps its own temporary tab, so the column holds two. No pane showed a file, and the left pane had the focus, so a press on README.md in All files opened it in the temporary tab of the left pane. Then the user went back to Address autocomplete, clicked the chat of the right pane, and pressed AddressForm.tsx in Changes. No pane showed a file, so the press used the focused right pane, and the diff opened in a new temporary tab at the end of the right row. README.md stayed in the left row. Both titles show in italics, and a screen reader hears ", temporary" after each name. The right pane has the focus, so the icon of its shown tab takes the accent colour. On a phone, the row holds only the two sessions, and the chat shows Address autocomplete, the shown session of the other pane, because a phone shows each file in its Files tab.',
  rationale:
    'Split panes decision 5 B, which the user chose on 16 November 2026: one temporary tab in each pane, as VS Code keeps one preview tab in each editor group. A press replaces only the temporary tab of its own pane, so it never moves, hides, or closes a tab of the other pane. Each rule of the temporary tab applies inside its pane: a replace keeps the place of the tab, and a double-click or Keep open keeps it (decisions 284 to 287). Split panes decision 3 B, from 13 November 2026, says which pane a press uses: the pane that shows a file or a diff, or else the focused pane. A design call of 13 November 2026 shows the shown session of the other pane in the Chat tab of a phone, when the focused pane shows a file. The screen hides the right column, so that each pane has more room in the frame of the catalogue.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, panes: 'temporary', rightColumn: 'hidden' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'replaced',
      title: 'A press replaces the tab of its pane',
      description:
        'Then the user pressed useAddressAutocomplete.ts in Changes. Only the right pane shows a file, so the press uses the right pane. The file replaces AddressForm.tsx in the temporary tab of that pane, in its place, and its title shows in italics. The right pane keeps the focus. The left pane and its temporary README.md tab do not change. The next press that uses the right pane replaces useAddressAutocomplete.ts in turn, unless a double-click or Keep open keeps it first. On a phone, the row and the chat do not change, and the file opens as a page of the Files tab.',
      rationale:
        'Split panes decision 5 B, which the user chose on 16 November 2026: a press replaces the temporary tab of its own pane, in its place, as decision 284 B says for one row. The column never holds more than two temporary tabs, one in each pane. A press that moved the temporary tab of the other pane, or that closed that pane when the tab was its last one, was not chosen. Split panes decision 3 B, from 13 November 2026: a press uses the pane that shows a file, so it does not hide the chat of the other pane.',
      props: { panes: 'temporary-replaced' },
    },
  ],
})
