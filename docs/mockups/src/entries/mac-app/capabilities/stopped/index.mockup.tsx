import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../../screens/MacAppScreen'
import { macAppSchema } from '../../../../screens/macAppState'

export const macCapabilitiesStopped = defineScreen({
  title: 'Stopped by a switch-off',
  description:
    'Cal turned the switch off. This Mac stopped the grant until Stop of the workspace and saved the change. So the switch is off, and under it the result says Stopped: each command from this workspace asks first. The bar of the workspace names the same result for 5 seconds. Agents can still ask to run commands, and this Mac asks first. A Stop that the Mac did not save or did not make shows its result under the switch in the same way, with the words of the bar in mac-app/stop. Stopped does not show while a grant of the workspace runs again, because it belongs to an earlier grant.',
  rationale:
    "The design of 20 November 2026: the result of a Stop shows under the control that made it. Mac access decision 7 (21 November 2026): a switch-off stops the grant until Stop on this Mac only, as Stop does. The user asked for an explicit result of each change of the Mac's settings: done, done but not saved, or failed (7 November 2026).",
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'allow-until-stop',
    change: 'stopped',
    composer: 'capabilities-stopped',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
})
