import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../screens/MacAppScreen'
import { macAppSchema } from '../../../screens/macAppState'

export const macCapabilities = defineScreen({
  title: 'Capabilities',
  description:
    'Cal turned Mac access on in the Capabilities of Checkout address autocomplete, in the Mac app. The switch saved, and then this Mac started Allow all commands until I stop for the workspace. So under the switch, the line Allow all commands on this Mac is checked, and its hint says that commands from this workspace run without asking, until Cal stops. The bar of the workspace says Until you stop, with Stop. An uncheck stops the grant on this Mac, as Stop does, and Mac access stays on, as mac-app/capabilities/stopped shows. The control is drawn scrolled to its end, where Cal used the switch. A browser shows a note in place of the line, as app/capabilities shows.',
  rationale:
    'Mac access decision 1 C (20 November 2026): turning Mac access on in the Mac app also starts a grant until Stop on the Mac of the member who turned it on. Mac access decision 4 A: while the switch is on, the control shows the line of this Mac, so each member starts or stops the grant of their own Mac. The control reads the state of the line from the settings of this Mac, and counts a grant as started only when the settings list it with no end. The workspace check stays (decision 2 A): while Mac access is off, the Worker refuses each Mac command of the workspace. Risk: while the grant runs, each turn that Cal sends can run any command on his Mac with no question. The other states of the line are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'allow-until-stop',
    change: 'none',
    composer: 'capabilities-checked',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
})
