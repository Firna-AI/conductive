import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesTemporary = defineScreen({
  title: 'Temporary tab',
  description:
    'The user pressed README.md in All files, so it opens in the temporary tab at the end of the row. Its title shows in italics, and nothing else on the tab changes. The next press on a file or a diff replaces it. useAddressAutocomplete.ts is a kept tab, so its title stays upright. A screen reader hears "README.md, temporary". On a phone, README.md opens as a page of the Files tab, because a phone row shows no file tabs.',
  rationale:
    'The user chose option B of decision 284 on 11 November 2026: one temporary tab, as VS Code, Zed, and JetBrains have, so a glance at a file leaves no tab that the user must close. The user chose option A of decision 285 on the same day: no button shows on the tab, so the italic title is its only mark. A design call of 11 November 2026 tells a screen reader that the tab is temporary, because the italics carry the state only for the eye. A design call of 12 November 2026 puts "temporary" after the name, as VS Code puts "preview" after the name of its preview tab, so the name still starts with the file. The tab menu and the move messages keep the plain name. A new temporary tab opens at the end of the row, as each new tab does (decision 186).',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
    tab: 'markdown',
    temporary: 'opened',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'replaced',
      title: 'Another file replaces it',
      description:
        'Then + started a new session, whose tab opened at the end of the row, after README.md. Now the user pressed AddressForm.tsx in Changes. Its diff opens in the temporary tab, in the place of README.md, before Untitled, and README.md leaves the row. On a phone, the diff takes the place of README.md as the page of the Files tab.',
      rationale:
        'The user chose option B of decision 284 on 11 November 2026: the next press replaces the file of the temporary tab, so the row keeps at most one tab of a glance. A design call of 11 November 2026 keeps the place of a replaced temporary tab, from the tab row rules of decision 186: only a new tab opens at the end of the row. A press on a file that has a tab shows that tab, and the temporary tab stays as it is.',
      props: { files: 'changes', tab: 'diff', temporary: 'replaced' },
    },
    {
      slug: 'kept',
      title: 'Keep it, then press another file',
      description:
        'The user double-clicked the temporary README.md tab, so it is a kept tab: its title is upright, and it stays in its place. A double-click on its row in All files keeps it too. Then a press on AddressForm.tsx in Changes opened its diff in a new temporary tab, at the end of the row. On a phone, the diff opens as the page of the Files tab, and a phone keeps no file tab.',
      rationale:
        'The user chose option B of decision 284 on 11 November 2026: a double-click on the file or on the tab keeps the temporary tab, and the next press then opens a new temporary tab. The user chose option A of decision 285 on the same day, so nothing new shows on the tab. On 12 November 2026, with decision 286, the user confirmed the double-click on the row of the Files panel and on the tab. A design call of 11 November 2026 keeps a kept tab in its place and opens the next temporary tab at the end of the row, as each new tab opens there. The second click of a double-click opens nothing again, and it selects no text.',
      props: { files: 'changes', tab: 'diff', temporary: 'kept' },
    },
    {
      slug: 'menu',
      title: 'Tab menu of the temporary tab',
      description:
        'A right click on the temporary AddressForm.tsx tab opens its menu: Keep open, a line, then Move left and Move right. The tab stands between two tabs, so both moves are on. Keep open makes it a kept tab, with an upright title, in the same place. Shift+F10 and the Menu key on the focused tab open the same menu. The menu of a kept file or diff tab has only Move left and Move right. A phone row shows no file tabs, so a phone opens no menu for the temporary tab.',
      rationale:
        'The user chose option B of decision 286 on 12 November 2026: Keep open in the tab menu of the temporary tab, so a keyboard user and a screen-reader user can keep a tab, and the tab shows nothing new. A design call of the same day puts Keep open first, then a line, then the moves, because the tab menu groups its items by kind (decision 188). Another design call of that day gives Keep open the icon of a bookmark with a check, because a pin names the pinned tabs of a browser and of VS Code. After Keep open, the focus goes back to the tab, and a screen reader hears that the tab stays open. A read-only workspace leaves out Keep open (decision 214), so a file or diff tab there opens no menu.',
      props: {
        files: 'changes',
        tab: 'diff',
        temporary: 'replaced',
        overlay: 'tab-menu',
      },
    },
    {
      slug: 'drag',
      title: 'Move the temporary tab',
      description:
        'The user drags the temporary README.md tab between the two sessions. The lifted copy and the faint copy at its place keep the italic title, and a line shows where it lands. When the drop changes its place, the tab becomes a kept tab, and its title turns upright. A drag that Escape cancels, or that ends in the same place, keeps it temporary. A phone row shows no file tabs, so a phone shows README.md in its Files tab.',
      rationale:
        'The user chose option B of decision 287 on 12 November 2026: a move keeps the temporary tab, as VS Code does, because a move shows that the user wants the file at that place. Move left and Move right make the same move as a drag, so they keep the tab too. A design call of the same day keeps the tab temporary when its place does not change, as the text of option B says. The lifted copy keeps the italics, so the user still sees which kind of tab moves.',
      props: { tabRow: 'drag' },
    },
  ],
})
