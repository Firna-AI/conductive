import { defineScreen } from '@mokly/mokly'
import {
  hexwavePage,
  OperatorOrgScreen,
  operatorOrgSchema,
} from '../../../../../screens/OperatorOrgScreen'

export const operatorOrgSwitchBuild = defineScreen({
  title: 'Switch build',
  description:
    'The switch build runs on e2b. The Provider account box gives boat, the account of Hexwave, then e2b with the time and the operator of the switch, and the state of the switch build with its time and a spinner. The line under the state says that new workspaces start on boat until the build succeeds, and names the 60-minute limit of each build. The workspaces count the switch build as a build that runs now. Stop switch asks first.',
  rationale:
    'Under switch decision 1 B, the account of the org changes in the same write that publishes the image of the switch build. Under switch decision 2 D, only the operator section shows the switch build. The box shows the state of the build and not its log, because the operator section shows only counts, names, IDs, dates, roles, states, codes, and weights.',
  relatedDocs: [],
  useCasePaths: ['user-flows/switch-org-account'],
  propSchema: operatorOrgSchema,
  props: { ...hexwavePage, switch: 'building' },
  render: (props, context) => (
    <OperatorOrgScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'stop',
      title: 'Stop the switch',
      description:
        'Stop switch asks first. The switch build on e2b stops, and Hexwave stays on boat, where its new workspaces still start. After the stop, the page has no switch, and Switch account comes back. A switch that waits gets the same question without the sentence about the build.',
      rationale:
        'Stop switch is the switch back of the design: a switch back to the account of the org during a switch build ends that build, and the org stays on its account. The org is still on its account, so the action names the stop, not a move.',
      props: { dialog: 'stop' },
    },
    {
      slug: 'failed',
      title: 'Switch build failed',
      description:
        'The switch build failed after 10m 04s, because it got errors from e2b. Hexwave stays on boat, and its new workspaces still start there. Switch account leads the box again, so that the operator can try again. Members see no failure, no Settings mark, and no Try again.',
      rationale:
        'A failed switch build leaves the org on its old account (switch decision 1 B), and the page of the org shows its failure, with Switch account again. The words name the cause for the operator. The saved message of a build is written for members, and it asks them to check a log that the operator section does not show.',
      props: { switch: 'failed' },
    },
  ],
})
