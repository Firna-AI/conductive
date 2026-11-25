import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const skillTabTemporary = defineScreen({
  title: 'Temporary skill tab',
  description:
    'Before, a press on README.md in All files opened it in the temporary tab, and + then started a new session, whose tab opened after it. Now Cal pressed the chip plans in Address autocomplete. The skill opens in the temporary tab, in the place of README.md, before Untitled, and README.md leaves the row. The next press on a file, a diff, or another skill replaces the skill in the same way. While the skill tab shows, Escape closes it, as its Close does. On a phone, the skill takes the place of README.md as the page of the Files tab.',
  rationale:
    'Cal chose option A of skill tab decision 2 on 24 November 2026: the row keeps one temporary tab for each tab that a press opens for a look, so a look at a skill and a look at a file share it. A press on a skill chip is a quick look, as a press on a file chip is. The rule names no list of kinds of tab, so a later kind of tab needs no new rule. A replaced tab keeps its place, from the tab row rules of decision 186.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'skill-answer',
    focus: 'files',
    tab: 'skill',
    temporary: 'replaced',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'kept',
      title: 'Keep it, then press a file',
      description:
        'Cal double-clicked the temporary skill tab, so it is a kept tab: its title is upright, and it stays in its place. Keep open in its tab menu keeps it too. Then a press on README.md in All files opened it in a new temporary tab, at the end of the row. On a phone, README.md opens as the page of the Files tab, and a phone keeps no skill tab.',
      rationale:
        'Skill tab decision 2 A keeps a skill tab as a file tab is kept, by decisions 284 to 286: a double-click on the tab, or Keep open in its tab menu. A double-click on a chip keeps no tab, because a chip in the message field takes a double-click for its text. The next press then opens a new temporary tab at the end of the row, as each new tab opens there.',
      props: { files: 'all', tab: 'markdown', temporary: 'skill-kept' },
    },
    {
      slug: 'return',
      title: 'Back to the kept skill',
      description:
        'After README.md opened in the temporary tab, Cal selected the kept skill tab plans. The skill shows, and it stays a kept tab with an upright title, in its place. README.md stays the temporary tab after it, with its title in italics, and the next press on a file, a diff, or another skill replaces README.md. A press on the chip plans shows the same tab. On a phone, the skill shows as the page of the Files tab.',
      rationale:
        'The user chose option B of decision 284 on 11 November 2026: a press on a file that has a tab shows that tab, and the temporary tab stays as it is. Skill tab decision 2 A gives a skill tab the same rule, so a return to a kept skill keeps it kept, and no tab that Cal chose closes.',
      props: { files: 'all', tab: 'skill', temporary: 'skill-shown' },
    },
    {
      slug: 'menu',
      title: 'Tab menu of the temporary skill tab',
      description:
        'Cal hid the sidebar, and a right click on the temporary skill tab opens its menu: Keep open, a line, Move left and Move right, a line, then Close other tabs and Close tabs to the right. The tab stands between two tabs, so both moves and both closes are on. Keep open makes it a kept tab, with an upright title, in the same place. The menu has no Copy path, because a skill has no path. The menu of a kept skill tab has the moves and the closes only. Shift+F10 and the Menu key on the focused tab open the same menu. A phone row shows no skill tabs, so a phone opens no menu for it.',
      rationale:
        'A design call of 24 November 2026 gives a skill tab the items that each tab gets, and no Copy path. Keep open leads the menu of the temporary tab, from decision 286 B, so a keyboard user and a screen-reader user can keep the tab.',
      props: { overlay: 'tab-menu', sidebar: 'hidden' },
    },
  ],
})
