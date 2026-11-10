import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../../screens/MacAppScreen'

export const macShortcutsSearch = defineScreen({
  title: 'Search',
  description:
    'A search for “tab” keeps each row whose label or words hold the word, in its group: Previous tab, Next tab, Close tab, Reopen closed session, and the fixed Open the menu of a focused tab in Navigation, New session in Chat, and the fixed Switch the palette tab in Menus and palette. Reopen closed session and New session match by their words, which the rows do not show. The other groups hide. Each row keeps its shortcuts and its controls, so a press on a shortcut still records new keys.',
  rationale:
    'The user chose option E of decision 195 on 10 November 2026: a search field at the top of the tab finds a row by its label and its words, with the matcher of the palette, so the two searches of the app agree. Each word of the query must be in a text of the row, in any case. The search does not take keys, because a text field cannot type ⌘ or ⌥, and the conflict line already names the command that has a recorded shortcut.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'shortcuts',
    command: 'none',
    change: 'none',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'found',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'fixed-keys',
      title: 'Fixed keys of a focused control',
      description:
        'A search for “move” finds the fixed keys at the end of the Workspace group, Move up or down in Menus and palette, and the rows of the Text group that move by word or by line. ⌥↑ and ⌥↓ move a focused workspace in the list. ← and → move a focused divider, ⇧← and ⇧→ move it in bigger steps, and Home and End make its panel narrowest or widest. Each row shows Fixed shortcut, and its label names the control that has the focus.',
      rationale:
        'The user chose option D of decision 193 on 10 November 2026. The row move takes ⌥ with ↑ or ↓ and no other modifier, and the divider takes ← and → alone or with ⇧. So ⌥⌘↑, ⌥⌘↓, and each recorded shortcut run their commands also from a focused row or divider. The tab lists these keys as fixed, so the recorder refuses them, as it refuses ⌘H.',
      props: { shortcutSearch: 'fixed' },
    },
    {
      slug: 'no-match',
      title: 'No match',
      description:
        'A search for “merge” matches no row. The tab says so in place of the groups, and suggests the name of a command, such as Close tab.',
      rationale:
        'The user chose option E of decision 195 on 10 November 2026, and with it a line for a search without a match. The palette answers such a search in the same way. The search takes only words, so the hint asks for a command name, not for keys.',
      props: { shortcutSearch: 'no-match' },
    },
  ],
})
