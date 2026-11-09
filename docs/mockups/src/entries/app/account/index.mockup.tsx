import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountSchema,
  connectedAccount,
} from '../../../screens/AccountScreen'

export const account = defineScreen({
  title: 'Account',
  description:
    'The GitHub sign-in with Sign out, then what every org shares: the GitHub App and the accounts where it is installed, the Claude and Codex logins, and the model and effort that new workspaces start with. Each login shows its kind and Remove: a subscription token for Claude, and an API key for Codex. Under each login, a switch says whether other members can use it in the sessions of the user. The Claude subscription token starts off, and the Codex API key starts on. The avatar at the bottom of the rail opens the account.',
  rationale:
    'Users sign in with GitHub only. The product is free for now, as the user chose in decision 45, so the account shows no plan, and it names no provider of cloud computers. All orgs share one GitHub App and the agent logins, as the user chose in decision 21. A login never goes back to the browser, so a connected login shows only its kind. The name of a kind depends on the agent, so a Codex token shows as an access token, as app/account/codex-token shows. The share switch is option B of decision 116, which the user chose on 7 November 2026. A Claude subscription is for one person, so its switch starts off. The owner of an API key may let a team use it, so its switch starts on. A Codex access token starts off, from decision 171. When the switch is off, a message of another member in a session of the user starts a new, empty session on the login of that member, as app/composer/not-shared and app/sessions/linked show. The hint under the switch says what its value does. The switch saves at once, as the model of new workspaces does.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: connectedAccount,
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
