import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountGeneral, accountSchema } from '../../../../screens/accountState'

export const connectClaude = defineScreen({
  title: 'Connect Claude',
  description:
    'Connect opened the form of Claude under its row. Claude connects with a subscription token, which the user makes with claude setup-token on their computer, with an Anthropic API key, or with an own endpoint, as app/account/own-endpoint shows. The notice of the composer for a missing agent leads here. So does the notice of the New workspace dialog.',
  rationale:
    'Decisions 24 and 37 allow a Claude subscription token or an Anthropic API key, and decision 1 of the own endpoint plan adds the own endpoint. The app tests a token or an API key once when the user connects it, as decision 33 notes. On a phone the three kinds wrap onto two lines. Moved here from a saved state of the Account page, with the same path, so that page shows only its canonical screen.',
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
