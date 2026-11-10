import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../screens/MacAppScreen'

export const macShortcuts = defineScreen({
  title: 'Keyboard shortcuts',
  description:
    'The Keyboard shortcuts tab of the account in the Mac app, after General and Preferences. A search field at the top finds a row by its words. The line under it says that keys without ⌘ go to the terminal while it has the focus. The tab lists each command with its shortcuts as small key chips, in the groups of Conductor. In each group, the commands that a person can change come first. A press on a shortcut records new keys in its place, + adds a shortcut, and a command without a shortcut shows Add shortcut. A command holds at most four shortcuts, so Previous tab and Next tab show no +. A fixed shortcut has no control. A fixed row among other commands shows Fixed shortcut, such as the keys of a focused workspace row and a focused divider at the end of the Workspace group. The groups of fixed shortcuts at the end, Menus and palette, Text, and Mac app, say it once under their titles. ⌥⌘/ and the Keyboard shortcuts row of the palette open the tab.',
  rationale:
    'The user chose option A of decision 190 on 9 November 2026, where shortcut changes live: they follow the account, and the person changes them row by row on this tab. The defaults copy the keys of Conductor, and a command without a Conductor key starts with none. The user chose option B of decision 191 on 9 November 2026, the default keys where a browser tab keeps the key of Conductor, and the plan applies it as option G. Such a command also gets a second default key that a browser tab lets through, such as ⌥⌘W for Close tab. The Mac app gives the page every key, so it takes both keys and marks no key as kept. The menus of the Mac app own their keys, so those show as fixed. On 10 November 2026 the user chose option E of decision 195, the search field, and option D of decision 193, the fixed keys of a focused workspace row and divider. The same day the user asked that the shortcuts not take the keys of the terminal or of the message field, so the tab says once which keys the terminal keeps. The tab in a browser and on a phone follows the research of the keys of a browser. The other states of the tab are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'shortcuts',
    command: 'none',
    change: 'none',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
})
