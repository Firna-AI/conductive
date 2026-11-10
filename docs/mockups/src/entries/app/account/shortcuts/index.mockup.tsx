import { defineScreen } from '@mokly/mokly'
import { productName } from '../../../../brand'
import { AccountScreen } from '../../../../screens/AccountScreen'
import {
  accountSchema,
  accountShortcuts,
} from '../../../../screens/accountState'

export const browserShortcuts = defineScreen({
  title: 'Keyboard shortcuts',
  description: `The Keyboard shortcuts tab of the account in a normal Chrome tab on a Mac, after General and Preferences. A search field at the top finds a row by its words. The lines under it say that keys without ⌘ go to the terminal while it has the focus, and that dimmed keys work in the Mac app or in ${productName} installed from Chrome. Chrome keeps ⌘N, ⌘T, ⌘W, ⇧⌘T, ⌃Tab, ⌃⇧Tab, ⇧⌘[, ⇧⌘], ⌥⌘←, and ⌥⌘→ in a tab, and the app leaves ⌘1 to ⌘9 and ⌘L to Chrome. Each of those keys is dimmed: an outline with dashes, no fill, and muted text. The second keys show as normal keys, such as ⌥⌘N for New workspace, ⌥⌘1 for Open workspace 1, and ⇧⌘L for Focus the message field. A press on a dimmed key still records new keys in its place. Restore workspace follows Archive workspace without a shortcut, so its row shows Add shortcut. Hide or show the sidebar, Back, Forward, Paste and match style, and the Mac app group show only in the Mac app. The fixed Open the menu of a focused tab ends the Navigation group, and the Text group lists the text keys of a Mac, with the keys that move or delete by word or by line in one row each.`,
  rationale:
    'The user chose option A of decision 190 on 9 November 2026: shortcut changes follow the account, so the tab shows in every browser, also on a phone, whose layout also serves a narrow window with a keyboard. The user chose option B of decision 191 on the same day, and the plan applies it as option G: each command whose key a supported browser keeps in a tab gets a second key that the tab lets through. On 10 November 2026 the user chose option B of decision 192: a tab leaves ⌘1 to ⌘9 and ⌘L to the browser, so Open workspace 1 to 9 use ⌥⌘1 to ⌥⌘9 there, and Focus the message field uses ⇧⌘L. A kept key and a key left to the browser look the same, because neither runs a command in this tab. Each stays a control, because it works where the browser keeps no key. The same day the user chose option E of decision 195, the search field, and option D of decision 193, the fixed keys of a focused workspace row and divider. The user also asked that the shortcuts not take the keys of the terminal or of the message field, so the tab says which keys the terminal keeps, and the Text group lists the keys of the text fields. The key research of that day changed Next effort level to ⌃⌘/, because macOS opens the Help menu on ⇧⌘/, and Stop the agent to ⌃⌘⌫, because ⇧⌘⌫ deletes to the start of the line in a text field. An agent call of the same day makes Restore workspace, which the palette offers for an archived workspace, a command without a default shortcut, as each palette action without a key of Conductor is. The other hosts and the states of the tab are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: accountShortcuts,
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
