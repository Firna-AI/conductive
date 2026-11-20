import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../../screens/MacAppScreen'
import { macAppSchema } from '../../../../screens/macAppState'

export const macCapabilitiesNotReached = defineScreen({
  title: 'Mac not reached',
  description:
    'Cal turned Mac access on while this Mac had no device connection, such as during a reconnect. The switch saved, and the start did not reach the Mac. The page cannot read the settings of this Mac, so the line is unchecked and off. Its result says Not started: this Mac is not available, so each command still asks first. The hint keeps what the line allows, because the result already says why the line is off. Once this Mac connects, a check of the line tries the start again.',
  rationale:
    'Mac access decision 3 A (20 November 2026): the switch still saves, and the control says that the Mac was not reached and still asks before commands. A grant that the Worker keeps for the next connection, and a switch that refuses to turn on until the Mac is reachable, were rejected. The design of 20 November 2026: while the page cannot read the settings of this Mac, the line shows unchecked and disabled, so it never claims a grant that may not exist.',
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
