import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountGeneral, accountSchema } from '../../../../screens/accountState'

export const connectClaude = defineScreen({
  title: 'Connect Claude',
  description:
    'Connect opened the form of Claude under its row. Claude connects with a subscription token, which the user makes with claude setup-token on their computer, or with an Anthropic API key. The notice of the composer for a missing agent leads here. So does the notice of the New workspace dialog.',
  rationale:
    'Decisions 24 and 37 allow a Claude subscription token or an Anthropic API key. The app tests the login once when the user connects it, as decision 33 notes. Moved here from a saved state of the Account page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, form: 'claude' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
