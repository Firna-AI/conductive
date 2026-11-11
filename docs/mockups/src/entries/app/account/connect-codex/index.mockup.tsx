import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountGeneral,
  accountSchema,
} from '../../../../screens/AccountScreen'

export const connectCodex = defineScreen({
  title: 'Connect Codex',
  description:
    'Claude is connected, and Connect opened the form of Codex. Its switch starts on API key, so the form asks for an OpenAI API key, with a link to the page where OpenAI makes one. The other choice is ChatGPT plan, a sign-in to the ChatGPT plan of the user, as app/account/connect-codex/chatgpt shows. The notice of the composer for a missing Codex leads here.',
  rationale:
    'Codex connects with an OpenAI API key or with a device code sign-in to the ChatGPT plan of the user, as the user chose in decision 175 on 10 November 2026. API key comes first and starts selected, because it needs no step before it, and the sign-in needs a setting of ChatGPT first. Moved here from a saved state of the Account page, with the same path, so that page shows only its canonical screen. The steps of the sign-in are a child page, so this page shows only its canonical screen too.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, form: 'codex' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
