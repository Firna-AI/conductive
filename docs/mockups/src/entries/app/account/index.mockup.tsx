import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountGeneral,
  accountSchema,
} from '../../../screens/AccountScreen'

export const account = defineScreen({
  title: 'Account',
  description:
    'The account in two tabs, General and Preferences, each a link with its own address. General shows the GitHub sign-in with Sign out, then what every org shares: the GitHub App and the accounts where it is installed, and the Claude and Codex logins. Each login shows its kind and Remove: a subscription token for Claude, and an API key for Codex. Under each login, a switch says whether other members can use it in the sessions of the user. The Claude subscription token starts off, and the Codex API key starts on. At the end of General comes the invite code of the user: the invite link with Copy, the code alone, and 3 of 5 invites left. The avatar at the bottom of the rail opens it.',
  rationale:
    'Users sign in with GitHub only. The product is free for now, as the user chose in decision 45, so the account shows no plan, and it names no provider of cloud computers. All orgs share one GitHub App and the agent logins, as the user chose in decision 21. A login never goes back to the browser, so a connected login shows only its kind. The name of a kind depends on the agent, so the ChatGPT sign-in of Codex shows as ChatGPT plan, as app/account/codex-token shows. The share switch is option B of decision 116, which the user chose on 7 November 2026. A Claude subscription is for one person, so its switch starts off. The owner of an API key may let a team use it, so its switch starts on. A ChatGPT plan of Codex starts off, from decisions 171 and 175. When the switch is off, a message of another member in a session of the user starts a new, empty session on the login of that member, as app/composer/not-shared and app/sessions/linked show. The hint under the switch says what its value does. The switch saves at once, as the model of new workspaces does. The tabs follow the tabs of the org settings. The other states of the page are child pages, so this page shows only its canonical screen. Each user with app access has one invite code with 5 invites, as the user asked in decision 160. The user sees how many invites are left, but not who used them. The words say "invite code" and "invite link", never "referral". The section comes last in General, after what every org needs, so that the form of an agent stays near the top on a phone.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: accountGeneral,
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
