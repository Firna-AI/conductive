import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountSchema,
  connectedAccount,
} from '../../../../screens/AccountScreen'

export const accountCodexToken = defineScreen({
  title: 'Codex with an access token',
  description:
    'Codex is connected with a Codex access token, so its row says Access token, and Claude keeps Subscription token. The switch under the Codex login starts off, as the switch of the Claude subscription token does. So a message of another member in a session of the user starts a new session on the login of that member. Connect in the form of a Codex access token leads here.',
  rationale:
    'The user chose option C of decision 171 on 9 November 2026: a new Codex access token is not shared, and one typed default for each agent and kind sets it. A personal token acts as the member who made it, and Section 3.1 of the OpenAI Services Agreement forbids the share of login credentials between users. The owner can still turn the switch on, as decision 116 allows for each login. The app stores no expiry date, so the row shows none, and an expired token fails its turn with the error of the agent.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...connectedAccount, codexLogin: 'token' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
