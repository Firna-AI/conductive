import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../../screens/MacAppScreen'
import { macAppSchema } from '../../../../screens/macAppState'

export const macCapabilitiesNotAvailable = defineScreen({
  title: 'Mac not available',
  description:
    'Cal opened Capabilities while this Mac had no device connection, such as during a reconnect. The page cannot read the settings of this Mac, so the switch is off and disabled. Under it, the short result says This Mac is not available. No start or Stop has a result to show. Each open of the control reads this Mac again.',
  rationale:
    'The design of 20 November 2026: while the page cannot read the settings of this Mac, the control shows the switch off and disabled, with "This Mac is not available." Reason: it never claims a grant that may not exist. The control reads this Mac at each open, with no polling. Mac access decision 7 (21 November 2026) keeps this short result.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'none',
    change: 'none',
    composer: 'capabilities-not-available',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
})
