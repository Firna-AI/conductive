import { defineScreen } from '@mokly/mokly'
import { AccountScreen, accountSchema } from '../../../screens/AccountScreen'

export const account = defineScreen({
  title: 'Account',
  description:
    'The GitHub sign-in with Sign out, then what every org shares: the GitHub App and the accounts where it is installed, the Claude and Codex logins, and the model and effort that new workspaces start with. Each login shows its kind, a subscription token or an API key, and Remove. The avatar at the bottom of the rail opens it.',
  rationale:
    'Users sign in with GitHub only. The product is free for now, as the user chose in decision 45, so the account shows no plan, and it names no provider of cloud computers. All orgs share one GitHub App and the agent logins, as the user chose in decision 21. A login never goes back to the browser, so a connected login shows only its kind.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { connections: 'connected', form: 'none' },
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
    {
      slug: 'connect-claude',
      title: 'Connect Claude',
      description:
        'Connect opened the form of Claude under its row. Claude connects with a subscription token, which the user makes with claude setup-token on their computer, or with an Anthropic API key. The notice of the composer for a missing agent leads here.',
      rationale:
        'Decisions 24 and 37 allow a Claude subscription token or an Anthropic API key. The app tests the login once when the user connects it, as decision 33 notes.',
      props: { form: 'claude' },
    },
    {
      slug: 'connect-codex',
      title: 'Connect Codex',
      description:
        'Claude is connected, and Connect opened the form of Codex, which takes an OpenAI API key, with a link to the page where OpenAI makes one.',
      rationale:
        'The app offers no ChatGPT plan sign-in for Codex, because OpenAI allows it for hosted apps only after a waitlist.',
      props: { form: 'codex' },
    },
  ],
})
