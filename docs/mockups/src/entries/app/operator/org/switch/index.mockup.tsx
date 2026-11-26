import { defineScreen } from '@mokly/mokly'
import {
  hexwavePage,
  OperatorOrgScreen,
  operatorOrgSchema,
} from '../../../../../screens/OperatorOrgScreen'

export const operatorOrgSwitch = defineScreen({
  title: 'Switch account',
  description:
    'Switch account in the Provider account box asks first. Hexwave runs on boat, and e2b is the only other configured account, so the question names e2b. It says that the switch builds the cloud computer of Hexwave again on e2b, with the same repositories and install script, that new workspaces start on e2b when that build succeeds and on boat until then, and that existing workspaces stay on boat. A failed build leaves Hexwave on boat, and only this page shows the build. No build of Hexwave runs, so Switch account starts the switch build at once.',
  rationale:
    'On 20 November 2026 the user asked that an operator can switch an org to another configured account, and chose that the org keeps its account until the build on the new account succeeds (switch decision 1 B). Members do not see the switch build (switch decision 2 D), so the question says that only this page shows it. The switch build copies the inputs of the current cloud computer, so a saved script that no admin built does not run. The question names accounts by their IDs in plain text, as the questions of Suspend and Lift on this page do.',
  relatedDocs: [],
  useCasePaths: ['user-flows/switch-org-account'],
  propSchema: operatorOrgSchema,
  props: { ...hexwavePage, dialog: 'switch' },
  render: (props, context) => (
    <OperatorOrgScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'running-build',
      title: 'Switch while a build runs',
      description:
        '@vex-ops, the admin of Hexwave, started a build 6 minutes ago, and it still runs. The question names that build, and says that the switch build starts when that build ends. End the build of @vex-ops now is off by default. When it is on, that build fails at once, the switch build starts, and an admin can try the ended build again. With the offer off, Switch account leads to the switch that waits.',
      rationale:
        'The user chose switch decision 3 D on 20 November 2026: the switch waits for a build of the org that runs, unless the operator ends it, and the question names that build and offers to end it. One job runs at a time in each org, as the org image protocol says.',
      props: { build: 'running', dialog: 'switch' },
    },
    {
      slug: 'three-accounts',
      title: 'Switch with three accounts',
      description:
        'The settings of the Worker have a third account, e2b-us, so the question offers each account other than boat by its ID, with e2b chosen. Its title and its words name the chosen account. The choice wraps onto more lines when many accounts do not fit, as the account choice of Create org does.',
      props: { accounts: 'three', dialog: 'switch' },
    },
    {
      slug: 'suspended',
      title: 'Switch a suspended org',
      description:
        'Hexwave is suspended, and no build runs until Lift. The question says that the switch build starts at Lift, and Switch account leads to the switch that waits for Lift.',
      rationale:
        'A suspended org gets a waiting switch, and Lift starts the switch build, as the design of the switch says.',
      props: { status: 'suspended', dialog: 'switch' },
    },
  ],
})
