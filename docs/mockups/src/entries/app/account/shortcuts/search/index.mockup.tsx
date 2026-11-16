import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../../screens/AccountScreen'
import {
  accountSchema,
  accountShortcuts,
} from '../../../../../screens/accountState'

export const browserShortcutsSearch = defineScreen({
  title: 'Search',
  description:
    'A search for “tab” in a normal Chrome tab on a Mac. Previous tab, Next tab, Close tab, and Reopen closed session show their dimmed keys beside their second keys, and the fixed Open the menu of a focused tab follows them. New session matches by its words, and Switch the palette tab by its label. On a phone, each row puts its shortcuts on a line under its label.',
  rationale:
    'The user chose option E of decision 195 on 10 November 2026: in every host, a search field finds a row by its label and its words, with the matcher of the palette. A dimmed key keeps its look in a search, so the rows that a person finds show where each key works.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountShortcuts, shortcutSearch: 'found' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'find',
      title: 'Find',
      description:
        'A search for “find” in a normal Chrome tab on a Mac. The Chat group shows Find with ⌘F, Find next with ⌘G, and Find previous with ⌥⌘G. Chrome keeps none of these keys in a tab, so none is dimmed. The fixed keys of the find field follow them: Enter for the next match, ⇧Enter for the previous match, and Esc, which closes the find bar.',
      rationale:
        'The user chose B of find decision 1 on 13 November 2026: ⌘F or Ctrl+F opens the find bar of the shown tab. The default keys copy Conductor, so Find has ⌘F and Find next has ⌘G. ⇧⌘G of Conductor already opens the pull request on GitHub, and two commands share no default key, so Find previous has ⌥⌘G, a key chosen by hand. The tab lists each fixed key, so the keys of the find field show as fixed rows.',
      props: { shortcutSearch: 'find' },
    },
    {
      slug: 'no-match',
      title: 'No match',
      description:
        'A search for “theme” matches no row, because the app has no theme command. The tab says so in place of the groups, and suggests the name of a command, such as Close tab.',
      rationale:
        'Decision 195 E of 10 November 2026 adds a line for a search without a match, as the palette has. The phone shows the same line. A person who knows Conductor can look for its theme key, which the app leaves out.',
      props: { shortcutSearch: 'no-match' },
    },
  ],
})
