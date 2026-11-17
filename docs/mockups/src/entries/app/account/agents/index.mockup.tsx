import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountAgents, accountSchema } from '../../../../screens/accountState'

export const agents = defineScreen({
  title: 'Agents',
  description:
    'The Agents tab of the account holds the Claude and Codex logins that every org uses. Each login shows its kind and Remove: a subscription token for Claude, and an API key for Codex. Under each login, a switch says whether other members can use it in the sessions of the user. The Claude subscription token starts off, and the Codex API key starts on. The link of a missing login, such as the Connect notice of New workspace, opens this tab with the form of that agent, as app/account/connect-claude shows.',
  rationale:
    'The user asked on 13 November 2026 for the agents to have their own tab of the account, after General. All orgs share the agent logins, as the user chose in decision 21. A login never goes back to the browser, so a connected login shows its kind, and an own endpoint also its host and its model list when app models are missing. The name of a kind depends on the agent, so the ChatGPT sign-in of Codex shows as ChatGPT plan, as app/account/codex-token shows. The share switch is option B of decision 116, which the user chose on 7 November 2026. A Claude subscription is for one person, so its switch starts off. The owner of an API key may let a team use it, so its switch starts on. A ChatGPT plan of Codex starts off, from decisions 171 and 175. When the switch is off, a message of another member in a session of the user starts a new, empty session on the login of that member, as app/composer/not-shared and app/sessions/linked show. The hint under the switch says what its value does. The switch saves at once, as the model of new workspaces does.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: accountAgents,
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
