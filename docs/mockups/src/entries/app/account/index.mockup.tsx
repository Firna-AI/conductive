import { defineScreen } from '@mokly/mokly'
import { AccountScreen, accountSchema } from '../../../screens/AccountScreen'

export const account = defineScreen({
  title: 'Account',
  description:
    'The GitHub sign-in with Sign out, then the invite code of the user: the invite link with Copy, the code alone, and 3 of 5 invites left. Then what every org shares: the GitHub App and the accounts where it is installed, the Claude and Codex logins, and the model and effort that new workspaces start with. Each login shows its kind, a subscription token or an API key, and Remove. The avatar at the bottom of the rail opens it.',
  rationale:
    'Users sign in with GitHub only. The product is free for now, as the user chose in decision 45, so the account shows no plan, and it names no provider of cloud computers. All orgs share one GitHub App and the agent logins, as the user chose in decision 21. A login never goes back to the browser, so a connected login shows only its kind. Each user with app access has one invite code with 5 invites, as the user asked in decision 160. The user sees how many invites are left, but not who used them. The words say "invite code" and "invite link", never "referral". The section sits under the sign-in, because both belong to the person, and so a phone shows it without a scroll.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { connections: 'connected', form: 'none', invites: 'left' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
