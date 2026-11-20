import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../screens/AccountScreen'
import { accountGeneral, accountSchema } from '../../../screens/accountState'

export const account = defineScreen({
  title: 'Account',
  description:
    'Settings, a dialog over the workspace list of Acme, open at Account › General. Its list holds the Account group, with General, Agents, Preferences, Keyboard shortcuts, and Stats, and the Acme group, with the six tabs of the org settings. Each tab is a link with its own address. Close and Esc return to the page below. General shows the GitHub sign-in with Sign out, then the GitHub App that every org shares and the accounts where it is installed. At the end of General comes the invite code of the user: the invite link with Copy, the code alone, and 3 of 5 invites left. The Agents tab holds the Claude and Codex logins, as app/account/agents shows. The Stats tab holds the counts of the person, as app/account/stats shows. The avatar at the bottom of the rail and Command-comma open this tab. On a phone the tab is a screen of its own, with Settings as the way back to the list at app/settings.',
  rationale:
    'Users sign in with GitHub only. The product is free for now, as the user chose in decision 45, so the account shows no plan, and it names no provider of cloud computers. All orgs share one GitHub App, as the user chose in decision 21. The user asked on 17 November 2026 for one place for the account and the org settings, which Command-comma opens, with the tabs in a list on the left, because many tabs at the top do not fit a phone. The user chose option D on 20 November 2026, a dialog over the whole window, after a review of four layouts. The user asked on 13 November 2026 for the agents to have their own tab, so General stays short. The other states of the page are child pages, so this page shows only its canonical screen. Each user with app access has one invite code with 5 invites, as the user asked in decision 160. The user sees how many invites are left, but not who used them. The words say "invite code" and "invite link", never "referral". The section comes last in General, after what every org needs. The user chose option A of decision 190 on 9 November 2026: the shortcut changes follow the account, so the Keyboard shortcuts tab shows in every browser, as app/account/shortcuts draws.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: accountGeneral,
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
