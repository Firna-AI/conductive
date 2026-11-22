import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../../screens/MacAppScreen'
import { macAppSchema } from '../../../../screens/macAppState'

export const macCapabilitiesNotReached = defineScreen({
  title: 'Mac not reached',
  description:
    'Cal turned the switch on just as this Mac lost its device connection, such as at a reconnect, so the start did not reach the Mac. The page cannot read the settings of this Mac now, so the switch is off and disabled. Its result says Not started: this Mac is not available, so each command still asks first. Once this Mac connects, turning the switch on tries the start again.',
  rationale:
    'Mac access decision 3 A (20 November 2026): the control says that the Mac was not reached and still asks before commands. A grant that the Worker keeps for the next connection was rejected, because the server would store a grant. The design of 20 November 2026: while the page cannot read the settings of this Mac, the switch shows off and disabled, so it never claims a grant that may not exist.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'none',
    change: 'none',
    composer: 'capabilities-not-reached',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
})
