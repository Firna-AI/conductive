import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountAgents, accountSchema } from '../../../../screens/accountState'

export const agents = defineScreen({
  title: 'Agents',
  description:
    'The Agents tab of the account holds the Claude and Codex logins that every org uses. Each login shows its kind and Remove: a subscription token for Claude, and an API key for Codex. Under each login, a switch says whether other members can use it in the sessions of the user. The Claude subscription token starts off, and the Codex API key starts on. The link of a missing login, such as the Connect notice of New workspace, opens this tab with the form of that agent, as app/account/connect-claude shows.',
  rationale:
    'The user asked on 13 November 2026 for the agents to have their own tab of the account, after General. All orgs share the personal logins, as the user chose in decision 21. An org can also have an org login for each agent, from decision 1 B of the org logins plan of 16 November 2026, which the org-login and every-member variants show. A login never goes back to the browser, so a connected login shows its kind, and an own endpoint also its host and its model list when app models are missing. The name of a kind depends on the agent, so the ChatGPT sign-in of Codex shows as ChatGPT plan, as app/account/codex-token shows. The share switch is option B of decision 116, which the user chose on 7 November 2026. A Claude subscription is for one person, so its switch starts off. The owner of an API key may let a team use it, so its switch starts on. A ChatGPT plan of Codex starts off, from decisions 171 and 175. When the switch is off, a message of another member in a session of the user starts a new, empty session on the login of that member, as app/composer/not-shared and app/sessions/linked show. The hint under the switch says what its value does. The switch saves at once, as the model of new workspaces does.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: accountAgents,
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'org-login',
      title: 'Agent served by an org login',
      description:
        'Cal has no Claude login of his own, and Acme has an org login for Claude. The Claude row keeps Connect. Under it, a line says "Your new sessions in Acme use Acme\'s login." Codex keeps its API key and its share switch. Futex and Firna have no org login, so no other line shows, and Claude has no login in those orgs until Cal connects one.',
      rationale:
        'Decision 4 of the org logins plan, which the user stated on 16 November 2026: a member of an org with a usable org login needs no login of their own for that agent. The plan asks for one short line for each org whose org login serves an agent that the member did not connect, so Cal knows where Claude works without a login of his own. The account names the default login for each org and agent, from the resolver of the Worker, so the page shows that value and does not work it out (option F of decision 6). The line names the org and not the kind or the host, because the Agents tab of the org settings shows those to every member. Connect stays, because Cal can still connect his own login for every org.',
      props: { orgLogin: 'no-own-login' },
    },
    {
      slug: 'every-member',
      title: 'Org login for every member',
      description:
        'Cal has his own Claude subscription token, and an admin of Acme turned on "Use for every member" under the Claude login of Acme. The Claude row stays as it was, with its share switch. Under the row, a line says "Your new sessions in Acme use Acme\'s login."',
      rationale:
        'The user chose decision 7 B of the org logins plan on 16 November 2026: while the switch is on, each new session in Acme takes the org login, also for a member with a login of their own. So the own login of Cal no longer serves his new sessions in Acme, and the line says so beside that login. His older sessions keep their login, and his other orgs keep using his own login. The plan asks for the line only for an agent that the member did not connect. The agent showed it here too, because the same default login from the server decides both cases, as a design call of 16 November 2026.',
      props: { orgLogin: 'every-member' },
    },
  ],
})
