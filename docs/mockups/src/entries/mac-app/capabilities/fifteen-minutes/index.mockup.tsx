import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../../screens/MacAppScreen'
import { macAppSchema } from '../../../../screens/macAppState'

export const macCapabilitiesFifteenMinutes = defineScreen({
  title: 'While the 15 minutes run',
  description:
    'Cal chose Allow all commands for 15 minutes at a request, so the bar shows 14:32 left. The line stays unchecked, because it is checked only while a grant until Stop runs. Its hint gives the same time left, and says that a check keeps the 15 minutes until Stop, as Keep until I stop in the bar does. The time left of the hint counts down with the bar.',
  rationale:
    'The design of 20 November 2026: the line reads its state from the settings of this Mac, and is checked only while they list a grant until Stop of the workspace. While the 15 minutes run, the line stays unchecked, and its hint gives the time left and says that a check keeps them until Stop.',
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
