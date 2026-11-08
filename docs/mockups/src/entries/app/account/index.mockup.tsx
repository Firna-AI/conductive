import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountGeneral,
  accountSchema,
} from '../../../screens/AccountScreen'

export const account = defineScreen({
  title: 'Account',
  description:
    'The account in two tabs, General and Preferences, each a link with its own address. General shows the GitHub sign-in with Sign out, then what every org shares: the GitHub App and the accounts where it is installed, and the Claude and Codex logins. Each login shows its kind, a subscription token or an API key, and Remove. The avatar at the bottom of the rail opens it.',
  rationale:
    'Users sign in with GitHub only. The product is free for now, as the user chose in decision 45, so the account shows no plan, and it names no provider of cloud computers. All orgs share one GitHub App and the agent logins, as the user chose in decision 21. A login never goes back to the browser, so a connected login shows only its kind. The tabs follow the tabs of the org settings. The other states of the page are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: accountGeneral,
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
