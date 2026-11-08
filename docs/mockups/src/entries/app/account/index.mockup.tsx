import { defineScreen } from '@mokly/mokly'
import { AccountScreen, accountSchema } from '../../../screens/AccountScreen'

export const account = defineScreen({
  title: 'Account',
  description:
    'The GitHub sign-in with Sign out, then what every org shares: the GitHub App and the accounts where it is installed, the Claude and Codex logins, and the model and effort that new workspaces start with. Each login shows its kind, a subscription token or an API key, and Remove. Under each login, a switch says whether other members can use it in the sessions of the user. The Claude subscription token starts off, and the Codex API key starts on. The avatar at the bottom of the rail opens the account.',
  rationale:
    'Users sign in with GitHub only. The product is free for now, as the user chose in decision 45, so the account shows no plan, and it names no provider of cloud computers. All orgs share one GitHub App and the agent logins, as the user chose in decision 21. A login never goes back to the browser, so a connected login shows only its kind. The share switch is option B of decision 116, which the user chose on 7 November 2026. A Claude subscription is for one person, so its switch starts off. The owner of an API key may let a team use it, so its switch starts on. When the switch is off, a message of another member in a session of the user starts a new, empty session on the login of that member, as app/sessions/linked shows. The hint under the switch says what its value does. The switch saves at once, as the model of new workspaces does.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { connections: 'connected', form: 'none', shareChange: 'none' },
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
    {
      slug: 'share-not-saved',
      title: 'Share setting not saved',
      description:
        'The user turned on the switch of the Claude login, and the app could not save the change. The switch shows the saved value, off, again. Under the hint, the row says that the change was not saved, and why. The words stay until the next change of that switch.',
      rationale:
        'The switch saves at once, so a change that failed must not look saved. The cause stays beside the switch, not in a toast that goes away, because the setting decides who can use the login.',
      props: { shareChange: 'not-saved' },
    },
  ],
})
