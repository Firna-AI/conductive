import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../../screens/AccountScreen'
import {
  accountSchema,
  accountShortcuts,
} from '../../../../../screens/accountState'

export const browserShortcutsFirefox = defineScreen({
  title: 'Firefox on a Mac',
  description:
    'The tab in a normal Firefox tab on a Mac. Firefox keeps ⌥⌘↑ and ⌥⌘↓, which switch its tabs, so Previous workspace and Next workspace dim them and keep ⌃⌘↑ and ⌃⌘↓. Firefox lets the page take ⇧⌘T, so Reopen closed session shows it as a normal key. The other dimmed keys are those of Chrome. Firefox installs no app on a Mac, so the line under the search field says that dimmed keys work in the Mac app.',
  rationale:
    'The user chose option B of decision 191 on 9 November 2026, and the plan applies it as option G: each command whose key any supported browser keeps gets a second key, and the tab dims the keys of the browser that it runs in. Firefox keeps other keys than Chrome, so ⌃⌘↑ and ⌃⌘↓ are the keys of a Firefox tab. Decision 192 B, which the user chose on 10 November 2026, leaves ⌘1 to ⌘9 and ⌘L to Firefox too.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountShortcuts, host: 'firefox-mac' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
