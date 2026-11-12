import { defineScreen } from '@mokly/mokly'
import { productName } from '../../../../../brand'
import { AccountScreen } from '../../../../../screens/AccountScreen'
import {
  accountSchema,
  accountShortcuts,
} from '../../../../../screens/accountState'

export const browserShortcutsWindows = defineScreen({
  title: 'Chrome on Windows',
  description: `The tab in a normal Chrome tab on Windows, with the keys of a Windows keyboard: the chips show Ctrl, Alt, and Shift as words. Chrome keeps Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Shift+T, Ctrl+Tab, and Ctrl+Shift+Tab in a tab, and the app leaves Ctrl+1 to Ctrl+9 and Ctrl+L to Chrome, so those keys are dimmed. The lines under the search field say that every key goes to the terminal while it has the focus, and that dimmed keys work in ${productName} installed from Chrome. Alt+1 to Alt+9 switch orgs. The second keys use Alt+Shift, such as Alt+Shift+N for New workspace and Alt+Shift+1 for Open workspace 1. Previous workspace and Next workspace also have Alt+Shift+PgUp and Alt+Shift+PgDn. Copy link has Ctrl+Shift+C, Create PR has Ctrl+Shift+P and Alt+Shift+P, Fix checks has Alt+Shift+X, Commit and push has Ctrl+Shift+Y, Merge PR has Ctrl+Shift+M, Open PR on GitHub has Ctrl+Shift+G, and Copy concise transcript has Alt+Shift+C. The Text group lists the text keys of Windows, such as Ctrl+Backspace and Alt+Backspace.`,
  rationale:
    'The user chose option A of decision 194 on 10 November 2026: Ctrl takes the place of ⌘, Shift stays, a Mac key with ⌥ and each second key use Alt+Shift with the same key, and Alt+1 to Alt+9 switch orgs. The key research of the same day chose the keys of two clashes, Alt+Shift+Z for Reopen closed session and Ctrl+Shift+L for Focus the message field. It gave Stop the agent Alt+Shift+S and Model picker Alt+Shift+M, because a text field of Linux uses the twins of their Mac keys. It added Alt+Shift+PgUp and Alt+Shift+PgDn, because the Orca screen reader of Linux takes Alt+Shift with the arrows. Decision 199 C, of 11 November 2026, gives the newer commands their keys by the same rule. Fix checks has Alt+Shift+X, the twin of ⌥⌘X, because Firefox switches the text direction of a text field on Ctrl+Shift+X. Decision 192 B, of the same day, leaves Ctrl+1 to Ctrl+9 and Ctrl+L to the browser in a tab. The Mac app runs only on a Mac, so the line names only the installed app. The user asked on 10 November 2026 that the shortcuts not take the keys of the terminal. A program in the terminal can read every key, such as Alt+B in a shell, or a recorded P or F2, so the terminal keeps every key. Windows and Linux share one keyboard in the account (decision 190, 9 November 2026), so Linux shows these keys too, as app/account/shortcuts/linux draws. The user chose B with D for decision 196 on 10 November 2026: a tab leaves to each browser the keys that it uses on its system to select a tab or to open its address bar. Windows browsers have no Alt+digit keys, so Alt+1 to Alt+9 work in this tab. The user chose D for decision 197 on the same day, so the keys of the tab stay.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountShortcuts, host: 'chrome-windows' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
