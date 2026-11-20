import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../../screens/MacAppScreen'
import { macAppSchema } from '../../../../screens/macAppState'

export const macCapabilitiesUnchecked = defineScreen({
  title: 'Without the grant',
  description:
    "Priya turned Mac access on in her Mac app, so her Mac allows all commands of the workspace. Cal's Mac has no grant until Stop for the workspace, so his line is unchecked, and each command asks first on his Mac. A check starts the grant on this Mac only. Each member sees the line of their own Mac.",
  rationale:
    'Mac access decision 4 A (20 November 2026): a second member starts the grant on their own Mac with the line. Turning the switch on starts a grant only on the Mac of the member who turned it on (decision 1 C), because one member must not remove the questions on the Mac of another member.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'none',
    change: 'none',
    composer: 'capabilities-unchecked',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
})
