import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../../screens/MacAppScreen'
import { macAppSchema } from '../../../../screens/macAppState'

export const macCapabilitiesFifteenMinutes = defineScreen({
  title: 'While the 15 minutes run',
  description:
    'Cal chose Allow all commands for 15 minutes at a request, so the bar shows 14:32 left, with Extend, Keep until I stop, and Stop. The switch stays off, because it is on only while a grant until Stop runs. The part has no hint, because the bar gives the time left. Turning the switch on keeps the 15 minutes until Stop, as Keep until I stop in the bar does.',
  rationale:
    'The design of 20 November 2026: the control reads the settings of this Mac, and the switch is on only while they list a grant until Stop of the workspace. While the 15 minutes run, the switch stays off. Mac access decision 7 (21 November 2026): Cal asked to remove the verbose copy, so only the bar gives the time left.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'allow-all',
    change: 'none',
    composer: 'capabilities-fifteen-minutes',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
})
