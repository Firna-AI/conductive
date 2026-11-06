import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../screens/MacAppScreen'

export const thisMac = defineScreen({
  title: 'This Mac',
  description:
    'The account in the Mac app, with the This Mac section: the name of the Mac, its state, and the commands that always run on it without asking, each with Remove. The Mac app keeps the sidebar of the org beside the account.',
  rationale:
    'Always allow covers the exact text of one command on this Mac, so the list shows each command as it was allowed (decision 62). The web app in a browser has no This Mac section.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: { window: 'window', page: 'account', command: 'none' },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'needs-input',
      title: 'A workspace needs input',
      description:
        'An agent asks to run a command on this Mac while the app shows This Mac. The workspace list marks Checkout address autocomplete with Needs input: a blue column that pulses. Its row opens the workspace, where the request waits above the composer.',
      rationale:
        'The request no longer opens a dialog over every page, so the user asked for a blue mark on the workspace that asks for help, an approval, or an answer (decision 62).',
      props: { command: 'prompt' },
    },
  ],
})
