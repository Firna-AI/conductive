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
      slug: 'no-match',
      title: 'No match',
      description:
        'A search for “merge” matches no row. The tab says so in place of the groups, and suggests the name of a command, such as Close tab.',
      rationale:
        'Decision 195 E of 10 November 2026 adds a line for a search without a match, as the palette has. The phone shows the same line.',
      props: { shortcutSearch: 'no-match' },
    },
  ],
})
