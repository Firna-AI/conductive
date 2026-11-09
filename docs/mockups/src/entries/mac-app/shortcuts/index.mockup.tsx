import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../screens/MacAppScreen'

export const macShortcuts = defineScreen({
  title: 'Keyboard shortcuts',
  description:
    'The Keyboard shortcuts tab of the account in the Mac app, after General and Preferences. It lists each command with its shortcuts as small key chips, in the groups of Conductor. In each group, the commands that a person can change come first. A press on a shortcut records new keys in its place, + adds a shortcut, and a command without a shortcut shows Add shortcut. A command holds at most four shortcuts, so Previous tab and Next tab show no +. A fixed shortcut has no control. A fixed row among other commands shows Fixed shortcut. The groups of fixed shortcuts at the end, Menus and palette, Text, and Mac app, say it once under their titles. ⌥⌘/ and the Keyboard shortcuts row of the palette open the tab.',
  rationale:
    'The user chose option A of decision 190 on 9 November 2026, where shortcut changes live: they follow the account, and the person changes them row by row on this tab. The defaults copy the keys of Conductor, and a command without a Conductor key starts with none. The user chose option B of decision 191 on 9 November 2026, the default keys where a browser tab keeps the key of Conductor, and the plan applies it as option G. Such a command also gets a second default key that a browser tab lets through, such as ⌥⌘W for Close tab. The Mac app gives the page every key, so it takes both keys and marks no key as kept. The menus of the Mac app own their keys, so those show as fixed. The tab in a browser and on a phone waits for decisions 192 and 194, and the keys of the workspace row move and the dividers wait for decision 193. The other states of the tab are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'shortcuts',
    command: 'none',
    change: 'none',
    palette: 'closed',
    keyChange: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
})
