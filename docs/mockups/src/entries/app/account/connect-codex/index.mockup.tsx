import { defineScreen } from '@mokly/mokly'
import { AccountScreen, accountSchema } from '../../../../screens/AccountScreen'

export const accountConnectCodex = defineScreen({
  title: 'Connect Codex',
  description:
    'Claude is connected, and Connect opened the form of Codex, which takes an OpenAI API key, with a link to the page where OpenAI makes one.',
  rationale:
    'The app offers no ChatGPT plan sign-in for Codex, because OpenAI allows it for hosted apps only after a waitlist.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: {
    connections: 'connected', form: 'codex', invites: 'left',
    shareChange: 'none',
  },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
