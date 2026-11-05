import { defineScreen } from '@mokly/mokly'
import { AccountScreen, accountSchema } from '../../../screens/AccountScreen'

export const account = defineScreen({
  title: 'Account',
  description:
    'The GitHub sign-in with Sign out, then what every org shares: the GitHub App and the accounts where it is installed, the Claude and Codex connections, and the model and effort that new workspaces start with. The avatar at the bottom of the rail opens it.',
  rationale:
    'Users sign in with GitHub only. Each org pays for its own plan, so billing lives in the org settings, and the account shows no plan and no provider. The agents say only Connect or Connected. All orgs share one GitHub App and the agent connections, as the user chose in decision 21.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { connections: 'connected' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'setup',
      title: 'Not connected yet',
      description:
        'During the first run: the user is signed in with GitHub, but the GitHub App is not installed yet, and neither agent is connected. The avatar in the rail leads here, and the way back leads to Get started.',
      props: { connections: 'not-connected' },
    },
  ],
})
