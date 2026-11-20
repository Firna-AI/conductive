import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../screens/MacAppScreen'
import { macAppSchema } from '../../../screens/macAppState'

export const macCapabilities = defineScreen({
  title: 'Capabilities',
  description:
    'Cal turned the Mac access switch on in the Capabilities of Checkout address autocomplete, in the Mac app. This Mac then started Allow all commands until I stop for the workspace, so the switch is on. The part has no hint. The bar of the workspace says Until you stop, with Stop. A switch-off stops the grant on this Mac, as Stop does, and mac-app/capabilities/stopped shows its result. Each member sees the switch of their own Mac. Agents can ask to run commands on this Mac also while the switch is off, and this Mac then asks first. A browser shows no Mac access part, as app/capabilities shows.',
  rationale:
    'Mac access decision 7 (21 November 2026): the control has one Mac access switch, and the switch gives access. On starts a grant until Stop of the workspace on this Mac, and off stops it. The switch reads its state from the settings of this Mac, and counts a grant as started only when the settings list it with no end. Agents can always ask, because the member can deny each question on the Mac. Cal asked to remove the verbose copy, so the part has no hint and shows only short results. The switch replaces the shared switch and the line Allow all commands on this Mac. Risk: while the grant runs, each turn that Cal sends can run any command on his Mac with no question. The other states of the switch are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'allow-until-stop',
    change: 'none',
    composer: 'capabilities-on',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
})
