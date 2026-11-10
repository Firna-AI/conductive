import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountGeneral, accountSchema } from '../../../../screens/accountState'

export const connectCodex = defineScreen({
  title: 'Connect Codex',
  description:
    'Claude is connected, and Connect opened the form of Codex, which takes an OpenAI API key, with a link to the page where OpenAI makes one.',
  rationale:
    'The app offers no ChatGPT plan sign-in for Codex, because OpenAI allows it for hosted apps only after a waitlist. Moved here from a saved state of the Account page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, form: 'codex' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
