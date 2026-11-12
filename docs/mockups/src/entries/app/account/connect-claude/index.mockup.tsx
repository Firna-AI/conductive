import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountGeneral, accountSchema } from '../../../../screens/accountState'

export const connectClaude = defineScreen({
  title: 'Connect Claude',
  description:
    'Codex is connected, and Connect opened the form of Claude under its row. Its switch starts on Subscription token, which the user makes with claude setup-token on their computer. The other choice is an Anthropic API key. The notice of the composer for a missing agent leads here. So does the notice of the New workspace dialog.',
  rationale:
    'Decisions 24 and 37 allow a Claude subscription token or an Anthropic API key. The app tests the login once when the user connects it, as decision 33 notes. Moved here from a saved state of the Account page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, form: 'claude' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'api-key',
      title: 'Connect Claude with an API key',
      description:
        'The user chose API key in the switch of the Claude form. The form asks for an Anthropic API key, with a link to the page where Anthropic makes one. Connect leads to the account.',
      rationale:
        'Decisions 24 and 37 allow an Anthropic API key for Claude. The app already offers this form, so the catalogue draws it too.',
      props: { form: 'claude-api-key' },
    },
  ],
})
