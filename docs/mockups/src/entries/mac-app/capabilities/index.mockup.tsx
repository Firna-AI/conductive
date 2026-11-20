import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../screens/MacAppScreen'
import { macAppSchema } from '../../../screens/macAppState'

export const macCapabilities = defineScreen({
  title: 'Capabilities',
  description:
    'Cal turned Mac access on in the Capabilities of Checkout address autocomplete, in the Mac app. The switch saved, and then this Mac started Allow all commands until I stop for the workspace. So under the switch, the line Allow all commands on this Mac is checked, and its hint says that commands from this workspace run without asking, until Cal stops. The bar of the workspace says Until you stop, with Stop. An uncheck stops the grant on this Mac, as Stop does, and Mac access stays on. The control is drawn scrolled to its end, where Cal used the switch. A browser shows a note in place of the line, as app/capabilities shows.',
  rationale:
    'Mac access decision 1 C (20 November 2026): turning Mac access on in the Mac app also starts a grant until Stop on the Mac of the member who turned it on. Mac access decision 4 A: while the switch is on, the control shows the line of this Mac, so each member starts or stops the grant of their own Mac. The control reads the state of the line from the settings of this Mac, and counts a grant as started only when the settings list it with no end. The workspace check stays (decision 2 A): while Mac access is off, the Worker refuses each Mac command of the workspace. Risk: while the grant runs, each turn that Cal sends can run any command on his Mac with no question.',
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
  variants: [
    {
      slug: 'unchecked',
      title: 'Without the grant',
      description:
        "Priya turned Mac access on in her Mac app, so her Mac allows all commands of the workspace. Cal's Mac has no grant until Stop for the workspace, so his line is unchecked, and each command asks first on his Mac. A check starts the grant on this Mac only. Each member sees the line of their own Mac.",
      rationale:
        'Mac access decision 4 A (20 November 2026): a second member starts the grant on their own Mac with the line. Turning the switch on starts a grant only on the Mac of the member who turned it on (decision 1 C), because one member must not remove the questions on the Mac of another member.',
      props: { command: 'none', composer: 'capabilities-unchecked' },
    },
    {
      slug: 'fifteen-minutes',
      title: 'While the 15 minutes run',
      description:
        'Cal chose Allow all commands for 15 minutes at a request, so the bar shows the time left. The line stays unchecked, because it is checked only while a grant until Stop runs. A check keeps the 15 minutes until Stop, as Keep until I stop in the bar does.',
      rationale:
        'The design of 20 November 2026: the line reads its state from the settings of this Mac. While the 15 minutes run, it shows unchecked, and a check keeps them until Stop.',
      props: { command: 'allow-all', composer: 'capabilities-unchecked' },
    },
    {
      slug: 'not-started',
      title: 'Not started',
      description:
        'Cal turned Mac access on, and the switch saved, but this Mac did not start the grant. The line stays unchecked, and its result says Not started, with the cause that the Mac gave. The result stays until the next change of the line. A check tries again, so the result has no Try again.',
      rationale:
        'The design of 20 November 2026: turning the switch on saves Mac access first, then starts the grant. A failed start keeps Mac access on and shows the cause on the line. A start is done or failed, never done but not saved, because the Mac keeps a grant until Stop only in memory.',
      props: { command: 'none', composer: 'capabilities-not-started' },
    },
    {
      slug: 'not-reached',
      title: 'Mac not available',
      description:
        'Cal turned Mac access on while this Mac had no device connection, such as during a reconnect. The switch saved, and the start did not reach the Mac. The line stays unchecked, and its result says that this Mac is not available, so each command still asks first. A check tries again once the Mac connects.',
      rationale:
        'Mac access decision 3 A (20 November 2026): the switch still saves, and the control says that the Mac was not reached and still asks before commands. A grant that the Worker keeps for the next connection, and a switch that refuses to turn on until the Mac is reachable, were rejected.',
      props: { command: 'none', composer: 'capabilities-not-reached' },
    },
  ],
})
