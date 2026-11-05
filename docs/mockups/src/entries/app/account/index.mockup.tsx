import { defineScreen } from '@mokly/mokly'
import { AccountScreen, accountSchema } from '../../../screens/AccountScreen'

export const account = defineScreen({
  title: 'Account',
  description:
    'The GitHub sign-in with Sign out, then what every org shares: the GitHub App and the accounts where it is installed, the Claude and Codex connections, and the model and effort that new workspaces start with. The avatar at the bottom of the rail opens it.',
  rationale:
    'Users sign in with GitHub only, and the app pays for every cloud computer, so the page shows no plan, no billing, and no provider. The agents say only Connect or Connected, because how a user connects them is still open. Waits on decision 21, drawn as its recommended option A: all orgs share one GitHub App and the agent connections.',
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
        'The first run: the user is signed in with GitHub, but the GitHub App is not installed yet, and neither agent is connected. Create org leads here.',
      props: { connections: 'not-connected' },
    },
  ],
})
