import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountSchema,
  connectedAccount,
} from '../../../../screens/AccountScreen'

export const connectAgent = defineScreen({
  title: 'Connect an agent',
  description:
    'Codex is connected, and Connect opened the form of Claude under its row. Its switch starts on Subscription token, which the user makes with claude setup-token on their computer. The other choice is an Anthropic API key. The notice of the composer for a missing agent leads here.',
  rationale:
    'Decisions 24 and 37 allow a Claude subscription token or an Anthropic API key. The app tests the login once when the user connects it, as decision 33 notes.',
  relatedDocs: [],
  movedFrom: 'app/account/connect-claude',
  propSchema: accountSchema,
  props: { ...connectedAccount, form: 'claude' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'claude-api-key',
      title: 'Connect Claude with an API key',
      description:
        'The user chose API key in the switch of the Claude form. The form asks for an Anthropic API key, with a link to the page where Anthropic makes one. Connect leads to the account.',
      rationale:
        'Decisions 24 and 37 allow an Anthropic API key for Claude. The app already offers this form, so the catalogue draws it too.',
      props: { form: 'claude-api-key' },
    },
    {
      slug: 'codex',
      title: 'Connect Codex',
      description:
        'Claude is connected, and Connect opened the form of Codex. Its switch starts on API key, so the form asks for an OpenAI API key, with a link to the page where OpenAI makes one. The other choice is an access token. The notice of the composer for a missing Codex leads here.',
      rationale:
        'Codex connects with an OpenAI API key or a Codex access token from a ChatGPT Business or Enterprise workspace, as the user chose in decision 170 on 9 November 2026. API key comes first and starts selected, because most members have one, and a token needs a Business or Enterprise workspace.',
      movedFrom: 'app/account/connect-codex',
      props: { form: 'codex' },
    },
    {
      slug: 'codex-token',
      title: 'Connect Codex with an access token',
      description:
        'The user chose Access token in the switch of the Codex form. The words above the field ask for an access token from a ChatGPT Business or Enterprise workspace, with the Codex scope, and say that the owner of that ChatGPT workspace must allow access tokens and local Codex use. Their link opens the page of ChatGPT where a member makes one. Connect leads to app/account/codex-token.',
      rationale:
        'OpenAI names it a Codex access token, so the switch says Access token, and the field says Codex access token. Members then find the token under that name in ChatGPT. Only Business and Enterprise workspaces make these tokens, and only when their owner allows them. A token also stops working when the member loses local Codex use. So the words say both before a member makes one. A member on another plan connects an API key. Codex runs only on a token with the Codex scope.',
      props: { form: 'codex-token' },
    },
  ],
})
