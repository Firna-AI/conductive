import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../../screens/MacAppScreen'
import { macAppSchema } from '../../../../screens/macAppState'

export const macCapabilitiesNotStarted = defineScreen({
  title: 'Not started',
  description:
    'Cal turned the switch on, but this Mac did not start the grant. So the switch is off, and under it the short result says Not started, with the cause that the Mac gave. The result stays until the next start or Stop of the workspace on this Mac. Turning the switch on tries again, so the result has no Try again.',
  rationale:
    'The design of 20 November 2026: a failed start shows its cause under the control that asked for it. A start is done or failed, never done but not saved, because the Mac keeps a grant until Stop only in memory. Mac access decision 7 (21 November 2026): the part shows only short results, such as Not started.',
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
