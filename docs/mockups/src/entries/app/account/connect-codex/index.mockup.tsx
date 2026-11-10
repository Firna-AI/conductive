import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountGeneral,
  accountSchema,
} from '../../../../screens/AccountScreen'

export const connectCodex = defineScreen({
  title: 'Connect Codex',
  description:
    'Claude is connected, and Connect opened the form of Codex, which takes an OpenAI API key, with a link to the page where OpenAI makes one. Codex can also take an own endpoint, as app/account/own-endpoint/codex shows.',
  rationale:
    'The app offers no ChatGPT plan sign-in for Codex, because OpenAI allows it for hosted apps only after a waitlist. Codex can also run on an own endpoint, such as a gateway or a proxy, as decision 1 of the own endpoint plan chose. Moved here from a saved state of the Account page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, form: 'codex' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
