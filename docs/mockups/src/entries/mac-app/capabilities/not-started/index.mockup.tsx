import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../../screens/MacAppScreen'
import { macAppSchema } from '../../../../screens/macAppState'

export const macCapabilitiesNotStarted = defineScreen({
  title: 'Not started',
  description:
    'Cal turned Mac access on, and the switch saved, but this Mac did not start the grant. The line stays unchecked, and its result says Not started, with the cause that the Mac gave. The result stays until the next change of the line. A check tries again, so the result has no Try again.',
  rationale:
    'The design of 20 November 2026: turning the switch on saves Mac access first, then starts the grant. A failed start keeps Mac access on and shows the cause on the line. A start is done or failed, never done but not saved, because the Mac keeps a grant until Stop only in memory.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'none',
    change: 'none',
    composer: 'capabilities-not-started',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
})
