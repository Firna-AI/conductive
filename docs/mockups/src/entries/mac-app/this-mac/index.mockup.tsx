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
})
