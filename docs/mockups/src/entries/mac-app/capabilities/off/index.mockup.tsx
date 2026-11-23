import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../../screens/MacAppScreen'
import { macAppSchema } from '../../../../screens/macAppState'

export const macCapabilitiesOff = defineScreen({
  title: 'Off',
  description:
    "Cal's Mac has no grant until Stop for Checkout address autocomplete, so his switch is off, with no hint. Priya turned her switch on in her Mac app, so only her Mac allows all commands of the workspace. Agents can still ask to run commands on Cal's Mac, and his Mac asks first. Each member sees the switch of their own Mac. Turning the switch on starts the grant on this Mac only.",
  rationale:
    'Mac access decision 7 (21 November 2026): the switch is personal, so it reads its state from the settings of this Mac. A grant on the Mac of every member was rejected, because one member must not remove the questions on the Mac of another member (Mac access decision 1 C). Agents can always ask, because the member can deny each question on the Mac.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'none',
    change: 'none',
    composer: 'capabilities',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
})
