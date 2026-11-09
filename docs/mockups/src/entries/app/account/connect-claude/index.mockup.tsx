import { defineScreen } from '@mokly/mokly'
import { AccountScreen, accountSchema } from '../../../../screens/AccountScreen'

export const accountConnectClaude = defineScreen({
  title: 'Connect Claude',
  description:
    'Connect opened the form of Claude under its row. Claude connects with a subscription token, which the user makes with claude setup-token on their computer, or with an Anthropic API key. The notice of the composer for a missing agent leads here.',
  rationale:
    'Decisions 24 and 37 allow a Claude subscription token or an Anthropic API key. The app tests the login once when the user connects it, as decision 33 notes.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: {
    connections: 'connected', form: 'claude', invites: 'left',
    shareChange: 'none',
  },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
