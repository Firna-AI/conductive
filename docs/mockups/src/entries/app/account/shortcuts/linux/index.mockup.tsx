import { defineScreen } from '@mokly/mokly'
import { productName } from '../../../../../brand'
import { AccountScreen } from '../../../../../screens/AccountScreen'
import {
  accountSchema,
  accountShortcuts,
} from '../../../../../screens/accountState'

export const browserShortcutsLinux = defineScreen({
  title: 'Chrome on Linux',
  description: `The tab in a normal Chrome tab on Linux, with the keys of Windows and Linux. From the user's answer of 10 November 2026 to decision 196, the app leaves to Chrome the keys that Chrome uses on Linux to select a tab or to open its address bar: Ctrl+1 to Ctrl+9, Alt+1 to Alt+9, and Ctrl+L. These keys are dimmed. Switch to org 1 to 9 show only dimmed keys. Open workspace 1 to 9 work through their second keys Alt+Shift+1 to Alt+Shift+9, and Focus the message field through Ctrl+Shift+L. Chrome also keeps Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Shift+T, Ctrl+Tab, and Ctrl+Shift+Tab, as on Windows. The lines under the search field say that every key goes to the terminal while it has the focus, and that dimmed keys work in ${productName} installed from Chrome.`,
  rationale:
    'The user chose B with D for decision 196 on 10 November 2026: in a normal tab, the app leaves to each browser the keys that the browser uses on its system to select a tab or to open its address bar. Chrome and Edge use Alt+1 to Alt+9 on Linux, so Switch to org 1 to 9 have no default key that works in this tab. No command gets a default key for Linux alone. The Switch to rows of the palette still reach each org, and the installed app takes Alt+1 to Alt+9. Windows and Linux share one keyboard in the account (decision 190, 9 November 2026), so the rows show the keys of Windows. The user chose D for decision 197 on the same day, so these keys stay. They also work for a person whose Linux layout switches on Alt+Shift.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountShortcuts, host: 'chrome-linux' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'firefox',
      title: 'Firefox on Linux',
      description: `The tab in a normal Firefox tab on Linux. From the user's answer of 10 November 2026 to decision 196, the app leaves only Alt+1 to Alt+9 and Ctrl+L to Firefox, because Firefox has no action on Ctrl+1 to Ctrl+9 on Linux. Switch to org 1 to 9 show only dimmed keys. Open workspace 1 to 9 keep Ctrl+1 to Ctrl+9 as normal keys, beside Alt+Shift+1 to Alt+Shift+9. Firefox lets the page take Ctrl+Shift+T, so Reopen closed session shows it as a normal key. Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Tab, and Ctrl+Shift+Tab are dimmed, as in Chrome. Firefox also keeps Ctrl+Shift+P, which opens its private window, so Create PR dims it and works through Alt+Shift+P. The line under the search field says that dimmed keys work in ${productName} installed from Chrome or Edge.`,
      rationale: `Decision 196 B with D, which the user chose on 10 November 2026, leaves to each browser only the keys that it uses itself. Firefox on Linux selects a tab on Alt+1 to Alt+9 and not on Ctrl+1 to Ctrl+9, so Open workspace 1 to 9 keep their first keys in its tab. Firefox keeps its keys of Windows and Linux there, and also Ctrl+Q, which quits Firefox on Linux and which no command uses. Decision 199 C, of 11 November 2026, gives Create PR the second key Alt+Shift+P for such a tab. Firefox installs no app on Linux, so the line names the browsers that install ${productName}. Decision 197 D, of the same day, keeps the keys of the tab.`,
      props: { host: 'firefox-linux' },
    },
  ],
})
