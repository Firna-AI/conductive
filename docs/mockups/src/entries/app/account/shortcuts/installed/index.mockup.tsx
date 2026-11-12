import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../../screens/AccountScreen'
import {
  accountSchema,
  accountShortcuts,
} from '../../../../../screens/accountState'

export const browserShortcutsInstalled = defineScreen({
  title: 'Installed app',
  description:
    'The tab in the app that Chrome installs on a Mac. The installed app gives the page every key, so no key is dimmed, and the line about dimmed keys is gone. ⌘N, ⌘T, ⌘W, ⌘1 to ⌘9, and ⌘L work here, beside their second keys. Hide or show the sidebar, Back, Forward, and the Mac app group still show only in the Mac app.',
  rationale:
    'An installed app of Chrome or Edge keeps no key, as "In Apps mode, no keys are reserved" in Chromium says. Decision 192 B, which the user chose on 10 November 2026, leaves ⌘1 to ⌘9 and ⌘L to the browser only in a normal tab. So the installed app takes Conductor\'s keys and the second keys, as the Mac app does (decision 191, 9 November 2026).',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountShortcuts, host: 'installed-mac' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
