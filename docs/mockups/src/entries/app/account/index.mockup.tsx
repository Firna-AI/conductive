import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../screens/AccountScreen'
import { accountGeneral, accountSchema } from '../../../screens/accountState'

export const account = defineScreen({
  title: 'Account',
  description:
    'The account in four tabs, General, Agents, Preferences, and Keyboard shortcuts, each a link with its own address. General shows the GitHub sign-in with Sign out, then the GitHub App that every org shares and the accounts where it is installed. At the end of General comes the invite code of the user: the invite link with Copy, the code alone, and 3 of 5 invites left. The Agents tab holds the Claude and Codex logins, as app/account/agents shows. The avatar at the bottom of the rail opens the account.',
  rationale:
    'Users sign in with GitHub only. The product is free for now, as the user chose in decision 45, so the account shows no plan, and it names no provider of cloud computers. All orgs share one GitHub App, as the user chose in decision 21. The tabs follow the tabs of the org settings. The user asked on 13 November 2026 for the agents to have their own tab, so General stays short. The other states of the page are child pages, so this page shows only its canonical screen. Each user with app access has one invite code with 5 invites, as the user asked in decision 160. The user sees how many invites are left, but not who used them. The words say "invite code" and "invite link", never "referral". The section comes last in General, after what every org needs. The user chose option A of decision 190 on 9 November 2026: the shortcut changes follow the account, so the Keyboard shortcuts tab shows in every browser, as app/account/shortcuts draws.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: accountGeneral,
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
